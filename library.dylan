Module: dylan-user

define library visualization-middleware
  use common-dylan;
  use io;
  use system;

  //compiler internals
  use registry-projects;
  use dfmc-flow-graph;
  use dfmc-debug-back-end;
  use environment-protocols;
  //for target-platform-name
  use build-system;
  //for find-project implementation
  use dfmc-environment-projects;
  //dfmc-conversion calls word-size(),
  //which calls back-end-word-size(current-backend())
  use dfmc-back-end-implementations;
  //for <signature-spec>
  use dfmc-definitions;

  use http-common;
  use http-server;

  use serialization;
end library;

define module visualization-middleware
  use common-dylan, exclude: { format-to-string };
  use date;
  use format;
  use format-out;
  use standard-io;
  use streams;
  use threads;
  use print;
  use file-system;

  //compiler internals
  use registry-projects;
  use dfmc-flow-graph;
  use dfmc-debug-back-end;
  use environment-protocols, exclude: { application-arguments,
                                        application-filename };
  use build-system, import: { target-platform-name };
  use dfmc-definitions, import: { <signature-spec> };


  //web stuff
  use http-common;
  use http-server;

  use json-serialization;
end module;
