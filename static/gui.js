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
            var fun = "handle_" + res.type.replace(new RegExp("-", 'g'), "_").replace("?", "Q")
            control.lastfun = fun
            var id = res.library + ":" + res.file + ":" + res.method
            var model = control.models[id]
            if (model == undefined) {
                console.log("I create a new model now")
                var graph = new Graph(canvas)
                graph.layouter = new HierarchicLayouter(canvas.width, canvas.height)
                model = new Model(id, graph)
                control.models[id] = model
                var li = document.createElement("li")
                li.innerHTML = id
                var cb = function (parent, ele, c, m) {
                    highlightElement(parent, ele)
                    c.setActiveModel(m)
                }
                li.onclick = cb.curry(forms, li, control, model)
                forms.appendChild(li)
                if (control.activeModel == undefined)
                    control.setActiveModel(model)
            }
            try {
                var graph = model.getGraph()
                var args = [model, graph, res]
                if (res.nodeid != undefined)
                    args.push(graph.findNodeByID(res.nodeid))
                if (res.other != undefined)
                    args.push(graph.findNodeByID(res.other))
                if (res.old != undefined)
                    args.push(graph.findNodeByID(res.old))
                control[fun].apply(control, args)
            } catch (e) {
                model.errors.push([e, fun, val])
                console.log(e, "error " + e.message + " in " + fun + ": " + val)
            }
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
        clearElement(output)
        if (control["before" + cmd[0]])
            control["before" + cmd[0]]()
        var oReq = new XMLHttpRequest()
        oReq.onload = cb.curry(control, output, inputfield)
        oReq.open("get", ("/execute/" + cmd.join("/")), true)
        oReq.send()
        break
    case 191: //?
        clearElement(output)
        var oReq = new XMLHttpRequest()
        oReq.onload = cb.curry(control, output, inputfield)
        oReq.open("get", ("/execute/help"), true)
        oReq.send()
        break
    default:
    }
}



function Phase (name, graph, force) {
    this.name = name
    this.graph = graph
    this.forced = force
}
function Model (method, graph) {
    this.method = method
    this.phases = [new Phase("initial", graph)]
    this.activePhase = this.phases[0]
    this.ready = false
    this.errors = []
}
Model.prototype = {
    getGraph: function () {
        if ((this.activePhase == null) || (this.activePhase.graph == null))
            console.log("undefined!!")
        return this.activePhase.graph
    },

    setActivePhase: function (phase) {
        this.activePhase = phase
    },

    addPhase: function (name, force) {
        if (this.ready)
            throw "trying to modify a finished TLD"
        var graph = this.getGraph()
        if (graph.modified)
            graph.mutable = false
        else {
            var lastphase = this.phases.pop()
            if (lastphase.forced)
                this.phases.push(lastphase)
        }
        var newgraph = graph.copy()
        newgraph.check()
        var phase = new Phase(name, newgraph, force)
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
        var ul = document.createElement("ul")
        for (var i = 0 ; i < res.projects.length ; i++) {
            var li = document.createElement("li")
            li.innerHTML = res.projects[i]
            ul.appendChild(li)
        }
        output.appendChild(ul)
    },

    executefilter: function (output, res) {
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
        var debuglist = document.getElementById("debug")
        clearElement(debuglist)
        for (var i = 0 ; i < model.errors.length ; i++) {
            var err = model.errors[i]
            var ele = document.createElement("li")
            ele.innerHTML = err[0].message + " in " + err[1] + ", data: " + err[2]
            debug.appendChild(ele)
        }

        var phaselist = document.getElementById("phases")
        clearElement(phaselist)
        for (var i = 0 ; i < model.phases.length ; i++) {
            var phase = model.phases[i]
            var ele = document.createElement("li")
            ele.innerHTML = "[" + phase.graph.nodes.length + " N, " + phase.graph.edges.length + " E] " + phase.name
            var cb = function (parent, ele, model, phase) {
                highlightElement(parent, ele)
                model.setActivePhase(phase)
            }
            ele.onclick = cb.curry(phaselist, ele, model, model.phases[i])
            phaselist.appendChild(ele)
        }
    },

    handle_new_computation: function (model, graph, json) {
        var ele = document.createElement("li")
        ele.innerHTML = json.description
        var desc = ele.textContent
        graph.insertNodeByID(json.nodeid, desc)
    },

    handle_new_temporary: function (model, graph, json, node, other) {
        var ele = document.createElement("li")
        ele.innerHTML = json.description
        var desc = ele.textContent
        var node = graph.insertNodeByID(json.nodeid, desc)
        node.fillStyle = "lightblue"
        //it is the generator!
        if (other) {
            var edge = graph.connect(other, node)
            if (edge)
                edge.strokeStyle = "lightblue"
        }
    },

    handle_new_object_reference: function (model, graph, json, node, other) {
        var ele = document.createElement("li")
        ele.innerHTML = json.description
        var desc = ele.textContent
        var node = graph.insertNodeByID(json.nodeid, desc)
        node.fillStyle = "lightblue"
        //it is the first user!
        if (other) {
            var edge = graph.connect(node, other)
            if (edge)
                edge.strokeStyle = "lightblue"
        }
    },

    handle_next_computation_setter: function (model, graph, json, node, other, old) {
        if (node && old && node != old)
            graph.disconnect(node, old)
        if (node && other && node != other) {
            var edge = graph.connect(node, other)
            if (edge)
                edge.strokeStyle = "black"
        }
    },

    handle_consequent_setter: function (model, graph, json, node, other, old) {
        if (node && old && node != old)
            graph.disconnect(node, old)
        if (node && other && node != other) {
            var edge = graph.connect(node, other)
            if (edge)
                edge.strokeStyle = "green"
        }
    },

    handle_alternative_setter: function (model, graph, json, node, other, old) {
        if (node && old && node != old)
            graph.disconnect(node, old)
        if (node && other && node != other) {
            var edge = graph.connect(node, other)
            if (edge)
                edge.strokeStyle = "red"
        }
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
        if (node && other && node != other) {
            var edge = graph.connect(node, other)
            if (edge)
                edge.strokeStyle = "lightblue"
        }
    },

    handle_function_setter: function (model, graph, json, node, other, old) {
        if (old && node && old != node)
            graph.disconnect(old, node)
        if (other && node && other != node) {
            var edge = graph.connect(other, node)
            if (edge)
                edge.strokeStyle = "lightblue"
        }
    },

    handle_call_iepQ_setter: function (model, graph, json, node) {
        if (json.description == true)
            node.setValue("IEP " + node.value)
    },

    handle_generator_setter: function (model, graph, json, node, other, old) {
        if (old && node && old != node)
            graph.disconnect(old, node)
        if (other && node && other != node) {
            var edge = graph.connect(other, node)
            if (edge)
                edge.strokeStyle = "lightblue"
        }
    },

    handle_computation_type_setter: function (model, graph, json, node) {
        //node.value = json.description
    },

    handle_start_phase_for_code: function (model, graph, json) {
        model.addPhase(json.description, true)
    },

    handle_optimizing: function (model, graph, json, node) {
        model.addPhase(json.description + " " +  node.value)
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

function highlightElement (parent, element) {
    for (var i = 0 ; i < parent.childNodes.length ; i++)
        parent.childNodes[i].className = ""
    element.className = "highlight"
}
