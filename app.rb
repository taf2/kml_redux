require 'rubygems'
require 'sinatra/base'
require "rack-flash"

class Application < Sinatra::Base
  set :public, 'public'
  enable :sessions
  use Rack::Flash, :sweep => true

  get '/' do
    erb :index
  end

  # echo uploaded file with tolerance
  post '/upload' do
   
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
end
