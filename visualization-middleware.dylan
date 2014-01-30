module: visualization-middleware

define function dbg (#rest args)
  apply(format-out, args);
  force-output(*standard-output*);
end;

let server = make(<http-server>,
                  listeners: list("127.0.0.1:8888"));

let static-resource = make(<directory-resource>,
                           directory: "/home/hannes/dylan/visualization-middleware/static",
                           allow-directory-listing?: #t);
add-resource(server, "/", static-resource);

let stream-resource = make(<sse-resource>);
add-resource(server, "/events", stream-resource);



define function do-handle-compiler (s :: <socket>) => ()
  while (#t)
    let data = read-line(s);
    sse-push-event(stream-resource, concatenate("data: [", data, "]"));
  end;
end;

/* need another listener socket for compiler, connecting to stream-resource */


let listen = make(<tcp-server-socket>, host: "localhost", port: 1234);

define function compiler-listener () => ()
  let client = accept(listen, no-delay?: #t);
  block ()
    do-handle-compiler(client);
  exception (e :: <condition>)
    dbg("restarting listener stuff due to %=\n", e);
    compiler-listener()
  end;
end;


make(<thread>, function: compiler-listener);

start-server(server);
