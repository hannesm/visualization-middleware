module: visualization-middleware

define function dbg (#rest args)
  apply(format-out, args);
  force-output(*standard-output*);
end;

define constant $stream-resource = make(<sse-resource>);

define function write-to-event-stream (data)
  let encoded = write-object-to-json-string(list(as(<property-list>, data)));
  sse-push-event($stream-resource, concatenate("data: ", encoded));
end;

define constant $command-table = make(<table>);

define abstract class <command> (<object>)
  constant slot command-name :: <symbol>, required-init-keyword: name:;
  constant slot command-description :: <string>, required-init-keyword: description:;
  constant slot command-signature :: <string> = " ", init-keyword: signature:;
end;

define generic execute (c :: <command>, #rest args);

define method make (class :: subclass(<command>), #rest rest, #key, #all-keys) =>
  (res :: <command>)
  let res = next-method();
  $command-table[res.command-name] := res
end;

define abstract class <text-command> (<command>)
end;

define class <help-command> (<command>)
end;
make(<help-command>,
     name: #"help",
     description: "You just found out what this did");

define method execute (help :: <help-command>, #rest args)
  let res = make(<stretchy-vector>);
  for (x in $command-table)
    if (instance?(x, <text-command>))
      let data = list(#"name", x.command-name,
                      #"description", x.command-description.quote-html,
                      #"signature", x.command-signature.quote-html);
      add!(res, as(<property-list>, data));
    end;
  end;
  list(type:, help:, commands:, res)
end;

define class <list-command> (<text-command>)
end;
make(<list-command>,
     name: #"list",
     description: "Lists all available projects");

define method execute (c :: <list-command>, #rest args)
  list(type:, list:, projects:, all-projects())
end;

define class <filter-command> (<text-command>)
end;
make(<filter-command>,
     name: #"filter",
     description: "Filters by given value (empty for deletion)",
     signature: "name|file|library <value>");

define function current-filter () => (res :: <list>)
  list(#"library", *trace-dfm-library*,
       #"file", *trace-dfm-file*,
       #"method", *trace-dfm-method*)
end;

define method execute (c :: <filter-command>, #rest args)
  if (args.size > 0)
    let type = as(<symbol>, args[0]);
    let val =
      if (args.size == 2)
        as(<symbol>, args[1])
      else
        #f
      end;
    select (type by \==)
      #"library" => *trace-dfm-library* := val;
      #"file" => *trace-dfm-file* := val;
      #"method" => *trace-dfm-method* := val
    end;
  end;
  concatenate(list(type:, filter:), current-filter())
end;

define class <build-command> (<text-command>)
end;
make(<build-command>,
     name: #"build",
     description: "Builds the specified project",
     signature: "<project-name>");

define function out (o :: <object>)
  block ()
    structured-output(o)
  exception (c :: <condition>)
    let str = make(<byte-string-stream>, direction: #"output");
    print-object(o, str);
    str.stream-contents
  end;
end;

define method execute (c :: <build-command>, #rest args)
  let name = args[0];
  dbg("name is %s args are %=\n", name, args);
  dynamic-bind(*trace-dfm-callback* = write-to-event-stream)
    dynamic-bind(*trace-dfm-outputter* = out)
      build(name)
    end;
  end;
  list(type:, build:)
end;

define function execute-handler (#key command, arguments)
  let response = current-response();
  set-header(response, "Content-type", "application/json");
  let ser = make(<json-serializer>, stream: response);
//  block ()
    let result = apply(execute, $command-table[as(<symbol>, command)], arguments);
    dbg("sending back %=\n", result);
    write-object(ser, list(as(<property-list>, result)));
//  exception (c :: <condition>)
//    dbg("condition occured %=\n", c);
//    let data = format-to-string("error while executing handler %=", c);
//    let d = list(type:, error:, message:, data.quote-html);
//    write-object(ser, list(as(<property-list>, d)));
//  end;
end;

