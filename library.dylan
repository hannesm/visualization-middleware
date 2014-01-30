Module: dylan-user

define library visualization-middleware
  use common-dylan;
  use io;
  use system;
  use network;

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

  use sockets;

  //web stuff
  use http-common;
  use http-server;

  use serialization;
  use json-serialization;
end module;
