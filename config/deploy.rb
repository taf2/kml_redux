set :application, "kml_redux"
set :repository,  "ssh://git@tools:222/#{application}"

set :scm, :git
set :deploy_to, "/var/www/apps/#{application}"
set :deploy_via, :remote_cache
set :environment, "production"
set :user, 'deployer'
set :use_sudo, false

task :production do
  set :gateway, "tools"
  set :port, 222

  set :default_environment, {
    'PATH'         => "/home/deployer/.rvm/rubies/ree-1.8.7-2010.01/bin:/home/deployer/.rvm/gems/ree-1.8.7-2010.01@kml/bin:/bin:/home/deployer/.rvm/bin:$PATH",
    'RUBY_VERSION' => 'ruby 1.8.7',
    'GEM_HOME'     => '/home/deployer/.rvm/gems/ree-1.8.7-2010.01@kml',
    'GEM_PATH'     => '/home/deployer/.rvm/gems/ree-1.8.7-2010.01@kml',
    'BUNDLE_PATH'  => '/home/deployer/.rvm/gems/ree-1.8.7-2010.01@kml'
  }

  set :gemset, "kml"
  set :rvm, "ree@#{gemset}"

  role :web, "slice6:222"
  role :app, "slice6:222"
  role :db, "slice6:222", :primary => true
  set :stage, "production"

end

task :local do
  set :default_environment, {
    'PATH'         => "/home/deployer/.rvm/rubies/ree-1.8.7-2010.02/bin:/home/deployer/.rvm/gems/ree-1.8.7-2010.02@kml/bin:/bin:/home/deployer/.rvm/bin:$PATH",
    'RUBY_VERSION' => 'ruby 1.8.7',
    'GEM_HOME'     => '/home/deployer/.rvm/gems/ree-1.8.7-2010.02@kml',
    'GEM_PATH'     => '/home/deployer/.rvm/gems/ree-1.8.7-2010.02@kml',
    'BUNDLE_PATH'  => '/home/deployer/.rvm/gems/ree-1.8.7-2010.02@kml'
  }

  set :ruby, "ree"
  set :gemset, "kml"
  set :rvm, "#{ruby}@#{gemset}"

  role :web, "spin"
  role :app, "spin"
  role :db, "spin", :primary => true

  set :stage, "staging"
end

after "deploy:symlink", "app:bundle"
after "deploy", "deploy:cleanup"

namespace :app do
  task :bundle, :roles => :app, :except => { :no_release => true } do
    run "echo $PATH"
    run "echo 'rvm use #{rvm}' > #{current_path}/.rvmrc"
    run "cd #{current_path} && bundle install --gemfile=Gemfile"
  end

  task :upgrade_bundler, :roles => :app, :except => { :no_release => true } do
    run "rvm use #{rvm} && gem up bundler"
  end

  task :setup do
    run "echo 'rvm use #{rvm}' > #{deploy_to}/.rvmrc"
    run "cd #{deploy_to} && rvm gemset create #{gemset}"
  end
end

namespace :deploy do
  task :start do
    command = "unicorn -E #{environment} -D -c #{current_path}/config/slice6_unicorn.rb"
    run "cd #{current_path} rvm use #{rvm} && bundle exec '#{command}'"
  end

  task :stop do
    pid = "#{shared_path}/pids/unicorn.pid"
    run "if [ -f #{pid} ]; then kill `cat #{pid}`; true; fi"
  end

  task :restart, :roles => :app, :except => { :no_release => true } do
    stop
    sleep 1 # pause after stop
    start
  end
end
