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
    var cb = function (canvas, control, event) {
        var x = event.pageX - canvas.offsetLeft
        var y = event.pageY - canvas.offsetTop
        var node = control.activeModel.getGraph().findNodeAt(x, y)
        control.activeModel.getGraph().setselected(node)
    }
    canvas.onclick = cb.curry(canvas, control)

    function handle_event (debug, control, forms, event) {
        try {
            var val = event.data
            var res = eval(val)[0]
            var fun = "handle_" + res.type.replace(new RegExp("-", 'g'), "_")
            control.lastfun = fun
            var model = control.models[res.method]
            if (model == undefined) {
                console.log("I create a new model now")
                var graph = new Graph(canvas)
                graph.layouter = new HierarchicLayouter(canvas.width, canvas.height)
                model = new Model(res.method, graph)
                control.models[res.method] = model
                var li = document.createElement("li")
                li.innerHTML = res.method
                var cb = function (c, m) { c.setActiveModel(m) }
                li.onclick = cb.curry(control, model)
                forms.appendChild(li)
                if (control.activeModel == undefined)
                    control.setActiveModel(model)
            }
            var graph = model.getGraph()
            var args = [model, graph, res]
            if (res.nodeid != undefined)
                args.push(graph.findNodeByID(res.nodeid))
            if (res.other != undefined)
                args.push(graph.findNodeByID(res.other))
            if (res.old != undefined)
                args.push(graph.findNodeByID(res.old))
            control[fun].apply(control, args)
            console.log("safely called " + fun)
        } catch (e) {
            var li = document.createElement("li")
            li.innerHTML = "error during " + control.lastfun + " data: " + event.data + ": " + e.message
            li.className = "error"
            debug.appendChild(li)
        }
    }


    var forms = document.getElementById("forms")
    var debug = document.getElementById("debug")

    var evtSource = new EventSource("events")
    evtSource.onmessage = handle_event.curry(debug, control, forms)

    var layout = document.getElementById("layout")
    layout.onclick = function () {
        control.activeModel.getGraph().layout()
        control.activeModel.getGraph().draw()
    }


    var output = document.getElementById("output")
    var shell = document.getElementById("shell")
    shell.onkeyup = handleKeypress.curry(output, shell, control)
}

function handleKeypress (output, inputfield, control, event) {
    var keyCode = ('which' in event) ? event.which : event.keyCode
    var val = inputfield.value
    var cb = function (control, output, inputfield) {
        var value = this.responseText
        var res = eval(value)[0]
        if (res.type == "error") {
            output.className = "error"
            output.innerHTML = res.message
        } else {
            inputfield.value = ""
            output.className = "highlight"
            control["execute" + res.type](output, res)
        }
    }

    switch (keyCode) {
    case 13: //return
        var cmd = val.split(" ")
        if (control["before" + cmd[0]])
            control["before" + cmd[0]]()
        var oReq = new XMLHttpRequest()
        oReq.onload = cb.curry(control, output, inputfield)
        oReq.open("get", ("/execute/" + cmd.join("/")), true)
        oReq.send()
        break
    case 191: //?
        var oReq = new XMLHttpRequest()
        oReq.onload = cb.curry(control, output, inputfield)
        oReq.open("get", ("/execute/help"), true)
        oReq.send()
        break
    default:
    }
}



function Phase (name, graph) {
    this.name = name
    this.graph = graph
}
function Model (method, graph) {
    this.method = method
    this.phases = [new Phase("initial", graph)]
    this.activePhase = this.phases[0]
    this.ready = false
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
        else
            this.activePhase.graph.mutable = false
        var graph = this.getGraph().copy()
        var phase = new Phase(name, graph)
        this.phases.push(phase)
        this.setActivePhase(phase)
    },
}

function Control () {
    this.activeModel = null
    this.models = null
    this.lastfun = ""
}
Control.prototype = {
    executehelp: function (output, res) {
        clearElement(output)
        var table = document.createElement("table")
        var tr = document.createElement("tr")
        var f = document.createElement("th")
        f.innerHTML = "Command"
        tr.appendChild(f)
        var g = document.createElement("th")
        g.innerHTML = "Description"
        tr.appendChild(g)
        var h = document.createElement("th")
        h.innerHTML = "Signature"
        tr.appendChild(h)
        table.appendChild(tr)

        for (var i = 0 ; i < res.commands.length ; i++) {
            var tr = document.createElement("tr")
            var json = res.commands[i]

            var nametd = document.createElement("td")
            nametd.innerHTML = json.name
            tr.appendChild(nametd)

            var descriptiontd = document.createElement("td")
            descriptiontd.innerHTML = json.description
            tr.appendChild(descriptiontd)

            var signaturetd = document.createElement("td")
            signaturetd.innerHTML = json.signature
            tr.appendChild(signaturetd)

            table.appendChild(tr)
        }
        output.appendChild(table)
    },

    executelist: function (output, res) {
        clearElement(output)
        var ul = document.createElement("ul")
        for (var i = 0 ; i < res.projects.length ; i++) {
            var li = document.createElement("li")
            li.innerHTML = res.projects[i]
            ul.appendChild(li)
        }
        output.appendChild(ul)
    },

    executefilter: function (output, res) {
        clearElement(output)
        var ul = document.createElement("ul")
        var l = document.createElement("li")
        l.innerHTML = "library: " + res.library
        ul.appendChild(l)
        var f = document.createElement("li")
        f.innerHTML = "file: " + res.file
        ul.appendChild(f)
        var m = document.createElement("li")
        m.innerHTML = "method: " + res.method
        ul.appendChild(m)
        output.appendChild(ul)
    },

    executebuild: function (output, res) {
        clearElement(output)
        var ul = document.createElement("ul")
        var l = document.createElement("li")
        l.innerHTML = "build successful!"
        l.className = "highlight"
        ul.appendChild(l)
        output.appendChild(ul)
    },

    beforebuild: function () {
        this.resetModels()
        var forms = document.getElementById("forms")
        clearElement(forms)
        var phases = document.getElementById("phases")
        clearElement(phases)
        var debug = document.getElementById("debug")
        clearElement(debug)
        console.log("successfully cleaned up")
    },

    resetModels: function () {
        this.models = new Object()
        this.activeModel = null
    },

    setActiveModel: function (model) {
        this.activeModel = model
        //need to care about canvas stuff
        var phaselist = document.getElementById("phases")
        clearElement(phaselist)
        for (var i = 0 ; i < model.phases.length ; i++) {
            var phase = model.phases[i]
            var ele = document.createElement("li")
            ele.innerHTML = "[" + phase.graph.nodes.length + " N, " + phase.graph.edges.length + " E] " + phase.name
            var cb = function (model, phase) {
                model.setActivePhase(phase)
            }
            ele.onclick = cb.curry(model, model.phases[i])
            phaselist.appendChild(ele)
        }
    },

    handle_new_computation: function (model, graph, json) {
        graph.insertNodeByID(json.nodeid, json.description[1])
    },

    handle_new_temporary: function (model, graph, json, node, other) {
        var node = graph.insertNodeByID(json.nodeid, json.description[1])
        node.fillStyle = "lightblue"
        //it is the generator!
        var edge = graph.connect(other, node)
        if (edge)
            edge.strokeStyle = "lightblue"
    },

    handle_new_object_reference: function (model, graph, json, node, other) {
        var node = graph.insertNodeByID(json.nodeid, json.description[1])
        node.fillStyle = "lightblue"
        //it is the first user!
        var edge = graph.connect(node, other)
        if (edge)
            edge.strokeStyle = "lightblue"
    },

    handle_next_computation_setter: function (model, graph, json, node, other, old) {
        graph.disconnect(node, old)
        var edge = graph.connect(node, other)
        if (edge)
            edge.strokeStyle = "black"
    },

    handle_remove_temporary: function (model, graph, json, node) {
        graph.remove(node)
    },

    handle_remove_computation: function (model, graph, json, node) {
        graph.remove(node)
    },

    handle_remove_temporary_user: function (model, graph, json, node, other) {
        graph.disconnect(node, other)
    },

    handle_add_temporary_user: function (model, graph, json, node, other) {
        var edge = graph.connect(node, other)
        if (edge)
            edge.strokeStyle = "lightblue"
    },

    handle_function_setter: function (model, graph, json, node, other, old) {
        graph.disconnect(old, node)
        var edge = graph.connect(other, node)
        if (edge)
            edge.strokeStyle = "lightblue"
    },

    handle_generator_setter: function (model, graph, json, node, other, old) {
        graph.disconnect(old, node)
        var edge = graph.connect(other, node)
        if (edge)
            edge.strokeStyle = "lightblue"
    },

    handle_computation_type_setter: function (model, graph, json, node) {
        node.value = json.description
    },

    handle_start_phase_for_code: function (model, graph, json) {
        model.addPhase(json.description, true)
    },

    handle_optimizing: function (model, graph, json, node) {
        model.addPhase(json.description + node.value)
    },

    handle_finished_phase_for_code: function (model, graph, json, node) {
        model.ready = true
    },

    handle_highlight_queue: function (model, graph, json) {
        //ignore for now
    },
}

function clearElement (element) {
    while (element.hasChildNodes())
        element.removeChild(element.firstChild)
}
