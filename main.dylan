module: visualization-middleware


define function main ()
  let server = make(<http-server>,
                    listeners: list("127.0.0.1:8888"));
  let static-resource = make(<directory-resource>,
                             directory: "/home/hannes/dylan/visualization-middleware/static",
                             allow-directory-listing?: #t);
  add-resource(server, "/", static-resource);
  add-resource(server, "/events", $stream-resource);
  let execute-resource = make(<function-resource>, function: execute-handler);
  add-resource(server, "/execute/{command}/{arguments*}", execute-resource);
  start-server(server);
end;

main()
