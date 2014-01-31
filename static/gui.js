Function.prototype.curry = function () {
  // wir merken uns f
  var f = this
  if (arguments.length < 1) {
    return f //nothing to curry with - return function
  }
  var a = toArray(arguments)
  return function () {
    var b = toArray(arguments)
    return f.apply(this, a.concat(b))
  }
}

function toArray (xs) {
  return Array.prototype.slice.call(xs)
}

function initialize () {
    var canvas = document.getElementById('canvas')
    var control = new Control()
    var debug = document.getElementById("debug")
    var cb = function (canvas, control, output, event) {
        var x = event.pageX - canvas.offsetLeft
        var y = event.pageY - canvas.offsetTop
        var node = control.activeModel.getGraph().findNodeAt(x, y)
        control.activeModel.getGraph().setselected(node)
        output.innerHTML = "node is: " + node.value
    }
    canvas.onclick = cb.curry(canvas, control, debug)

    function handle_event (output, control, forms, phases, event) {
        output.className = "normal"
        try {
            var val = event.data
            var res = eval(val)[0]
            var fun = "handle_" + res.type.replace(new RegExp("-", 'g'), "_")
            control.lastfun = fun
            if (fun == "handle_hello") {
                control.resetModels()
                clearElement(forms)
                clearElement(phases)
                console.log("successfully cleaned up")
            } else {
                if (res.formid) {
                    var model = control.models[res.formid]
                    if (model == undefined) {
                        console.log("I create a new model now")
                        var graph = new Graph(canvas)
                        graph.layouter = new HierarchicLayouter(canvas.width, canvas.height)
                        model = new Model(res.formid, graph)
                        control.models[res.formid] = model
                        var li = document.createElement("li")
                        li.innerHTML = res.formid
                        var cb = function (c, m) { c.setActiveModel(m) }
                        li.onclick = cb.curry(control, model)
                        forms.appendChild(li)
                        if (control.activeModel == undefined)
                            control.setActiveModel(model)
                    }
                    var graph = model.getGraph()
                    var args = [graph, res]
                    if (fun == "handle_optimizing")
                        console.log("we want to break")
                    if (res.nodeid != undefined)
                        args.push(graph.findNodeByID(res.nodeid))
                    if (res.other != undefined)
                        args.push(graph.findNodeByID(res.other))
                    if (res.old != undefined)
                        args.push(graph.findNodeByID(res.old))
                    control[fun].apply(control, args)
                    console.log("safely called " + fun)
                } else {
                    var args = [res]
                    control[fun].apply(control, args)
                    console.log("safely called (without form!) " + fun)
                }
            }
        } catch (e) {
            console.log("failed at or after " + control.lastfun + " with " + e.message)
            output.className = "error"
            output.innerHTML = "error during " +  event + ": " + e
        }
    }


    var output = document.getElementById("output")
    var forms = document.getElementById("forms")
    var phases = document.getElementById("phases")

    var evtSource = new EventSource("events")
    evtSource.onmessage = handle_event.curry(output, control, forms, phases)


    var layout = document.getElementById("layout")
    layout.onclick = function () {
        control.activeModel.getGraph().layout()
        control.activeModel.getGraph().draw()
    }

}

function Phase (name, graph) {
    this.name = name
    this.graph = graph
}
function Model (form, graph) {
    this.formid = form
    this.phases = [new Phase("initial", graph)]
    this.activePhase = this.phases[0]
}
Model.prototype = {
    getGraph: function () {
        if ((this.activePhase == null) | (this.activePhase.graph == null))
            console.log("undefined!!")
        return this.activePhase.graph
    },

    setActivePhase: function (phase) {
        this.activePhase = phase
    },

    addPhase: function (name, force) {
        if (! this.getGraph().modified)
            this.phases.pop
        var graph = this.getGraph().copy()
        var phase = new Phase(name, graph)
        this.phases.push(phase)
        this.setActivePhase(phase)
    },
}

function Control () {
    this.activeModel = null
    this.models = null
}
Control.prototype = {
    resetModels: function () {
        this.models = new Object()
        this.activemodel = null
    },

    setActiveModel: function (model) {
        this.activeModel = model
        //need to care about canvas stuff
        var phaselist = document.getElementById("phases")
        clearElement(phaselist)
        for (var i = 0 ; i < model.phases.length ; i++) {
            var ele = document.createElement("li")
            ele.innerHTML = model.phases[i].name
            var cb = function (model, phase) {
                model.setActivePhase(phase)
            }
            ele.onclick = cb.curry(model, model.phases[i])
            phaselist.appendChild(ele)
        }
    },

    handle_new_computation: function (graph, json) {
        graph.insertNodeByID(json.nodeid, json.description[1])
    },

    handle_new_temporary: function (graph, json, node, other) {
        var node = graph.insertNodeByID(json.nodeid, json.description[1])
        node.fillStyle = "lightblue"
        //it is the generator!
        var edge = graph.connect(other, node)
        if (edge)
            edge.strokeStyle = "lightblue"
    },

    handle_new_object_reference: function (graph, json, node, other) {
        var node = graph.insertNodeByID(json.nodeid, json.description[1])
        node.fillStyle = "lightblue"
        //it is the first user!
        var edge = graph.connect(node, other)
        if (edge)
            edge.strokeStyle = "lightblue"
    },

    handle_next_computation_setter: function (graph, json, node, other, old) {
        graph.disconnect(node, old)
        var edge = graph.connect(node, other)
        if (edge)
            edge.strokeStyle = "black"
    },

    handle_remove_temporary: function (graph, json, node) {
        graph.remove(node)
    },

    handle_remove_computation: function (graph, json, node) {
        graph.remove(node)
    },

    handle_remove_temporary_user: function (graph, json, node, other) {
        graph.disconnect(node, other)
    },

    handle_add_temporary_user: function (graph, json, node, other) {
        var edge = graph.connect(node, other)
        if (edge)
            edge.strokeStyle = "lightblue"
    },

    handle_function_setter: function (graph, json, node, other, old) {
        graph.disconnect(old, node)
        var edge = graph.connect(other, node)
        if (edge)
            edge.strokeStyle = "lightblue"
    },

    handle_generator_setter: function (graph, json, node, other, old) {
        graph.disconnect(old, node)
        var edge = graph.connect(other, node)
        if (edge)
            edge.strokeStyle = "lightblue"
    },

    handle_start_phase_for_code: function (graph, json) {
        this.activeModel.addPhase(json.description, true)
    },

    handle_optimizing: function (graph, json, node) {
        this.activeModel.addPhase(json.description + node.value)
    }
}

function clearElement (element) {
    while (element.hasChildNodes())
        element.removeChild(element.firstChild)
}
