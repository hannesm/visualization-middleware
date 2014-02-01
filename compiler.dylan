module: visualization-middleware

define function callback-handler (#rest args)
  log-debug("%=\n", args);
end function;

define constant $parse-lock = make(<lock>);

define function open-project-database (project :: <project-object>)
  open-project-compiler-database(project,
                                 warning-callback: callback-handler,
                                 error-handler: callback-handler);
  with-lock ($parse-lock)
    parse-project-source(project);
  end;
end function;

define variable *projects* = #f;

define function all-projects ()
  unless (*projects*)
    let names = make(<deque>);
    local method collect-project
              (dir :: <pathname>, name :: <string>, type :: <file-type>)
            if (type == #"file")
              push-last(names, name);
            end;
          end method;
    let registries = find-registries(as(<string>, target-platform-name()));
    let paths = map(registry-location, registries);
    for (path in paths)
      if (file-exists?(path))
        do-directory(collect-project, path);
      end;
    end for;
    *projects* := sort!(remove-duplicates!(names, test: \=));
  end unless;
  *projects*
end function;

define function find-library/module (library-name, module-name)
  let project = find-project(library-name);
  project.project-opened-by-user? := #t;
  open-project-database(project);
  let library = project.project-library;
  let module = if (module-name)
                 find-module(project, module-name,
                             library: library);
               else
                 #f;
               end;
  values(project, library, module);
end function;

define constant $build-lock = make(<lock>);

define function build (library-name)
  let (project, library) = find-library/module(library-name, #f);
  with-lock ($build-lock)
    let built? =
      build-project(project,
                    progress-callback:
                      method (#rest foo)
                      end method,
                    warning-callback:
                      method (#rest args)
                        dbg("build warning: %=\n", args);
                      end method,
                    error-handler:
                      method (#rest args)
                        dbg("build error: %=\n", args);
                      end method,
                    clean?: #t,
                    link?: #f,
                    save-databases?: #t,
                    process-subprojects?: #t);
  end with-lock;
end function;

