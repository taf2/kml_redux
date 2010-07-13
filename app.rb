require 'rubygems'
require 'sinatra'
require "sinatra/reloader"
require "rack-flash"

set :public, 'public'
enable :sessions
use Rack::Flash, :sweep => true

get '/' do
  erb :index
end

post '/upload' do
  
  puts params.inspect

  unless params[:kml_file] and (tempfile=params[:kml_file][:tempfile]) and (filename=params[:kml_file][:filename])
    flash[:error] = "No file selected -> #{params.inspect}"
    redirect '/'
    return
  end
  @filename = filename
  @type     = params[:kml_file][:type]
  @filecontent = tempfile.read
  @tolerance = params[:tolerance]

  erb :uploaded_kml
end
