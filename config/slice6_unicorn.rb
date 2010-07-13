listen "/tmp/kml.sock", :backlog => 64
worker_processes 2
working_directory "/var/www/apps/kml_redux/current"
timeout 30
pid "/var/www/apps/kml_redux/shared/pids/unicorn.pid"
stderr_path "/var/www/apps/kml_redux/shared/log/unicorn.stderr.log"
stdout_path "/var/www/apps/kml_redux/shared/log/unicorn.stdout.log"

preload_app true
GC.respond_to?(:copy_on_write_friendly=) and GC.copy_on_write_friendly = true
