import _ from 'underscore'
import BackboneRouter from './backbone-router'
import Route from './route'
import store from './store'

const defaultOptions = {
  // #### Backbone History options
  // Docs: http://backbonejs.org/#History

  // Use html5 pushState
  pushState: true,

  // Root url for pushState
  root: '',

  // Set to false to force page reloads for old browsers
  hashChange: true,

  // Don't trigger the initial route
  silent: false,

  // #### Backbone.Highway specific options

  // Print out debug information
  debug: false,

  // Event aggregator instance
  dispatcher: null
}

// Method to execute the 404 controller
const error404 = () => {
  // Retrieve the 404 controller
  const error = store.findByName('404')

  // Check if it was actually defined
  if (error) {
    // Execute a 404 controller
    error.execute()
  } else {
    // If no 404 controller is defined throw an error
    throw new Error('[ highway ] 404! Landing route is not registered')
  }
}

let lastRoute = null

// #### Highway public API definition
const highway = {
  // **Initialize the Backbone.Highway router**
  // - *@param {Object} **options** - Object to override default router configuration*
  start (options) {
    // Extend default options
    options = _.extend({}, defaultOptions, options)

    // Store options in global store
    store.set('options', options)

    // Instantiate Backbone.Router
    this.router = BackboneRouter.create()

    // Start Backbone.history
    const existingRoute = BackboneRouter.start(options)

    // Check if the first load route exists, if not and
    // the router is not started silently try to execute 404 controller
    if (!existingRoute && !options.silent) error404()
  },

  // **Register a route to the Backbone.Highway router**
  // - *@param {Object} **definition** - The route definition*
  route (definition) {
    // Create a new route using the given definition
    const route = new Route(definition)

    // Store the route in the global store
    store.save(route)

    // Check if Backbone.Router is already started
    if (this.router && route.get('path')) {
      // Dynamically declare route to Backbone.Router
      this.router.route(
        route.get('path'),
        route.get('name'),
        route.get('action')
      )
    }
  },

  // **Navigate to a declared route using its name or path**
  // - *@param {Mixed} **to** - Route name or Object describing where to navigate*
  go (to) {
    if (!_.isString(to) && !_.isObject(to)) {
      throw new Error(`[ highway.go ] Navigate option needs to be a string or an object, got "${to}"`)
    } else if (_.isObject(to) && !to.name && !to.path) {
      throw new Error('[ highway.go ] Navigate object is missing a "name" or "path" key')
    }

    // Transform route name to navigate object definition
    if (_.isString(to)) {
      to = { name: to }
    }

    // Find the route instance
    const route = store.find(to)

    // Check if the route exists
    if (!route) {
      error404()
      return false
    }

    // Parse the route path passing in arguments
    if (!to.path) {
      to.path = route.parse(to.args || to.params)
    }

    // Execute Backbone.Router navigate
    this.router.navigate(to.path, route.getNavigateOptions(to))

    // Force re-executing of the same route
    if (to.force && lastRoute && route.get('name') === lastRoute.get('name')) {
      this.reload()
    }

    // Store the last executed route
    lastRoute = route

    return true
  },

  // Reload current route by restarting `Backbone.history`.
  reload: BackboneRouter.restart,

  // Alias for `reload` method.
  restart: BackboneRouter.restart
}

export default highway
