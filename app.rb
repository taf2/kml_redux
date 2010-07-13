require 'rubygems'
require 'sinatra/base'

class Application < Sinatra::Base
  set :public, 'public'

  get '/' do
    erb :index
  end

  # echo uploaded file with tolerance
  post '/upload' do
   
    unless params[:kml_file] and (tempfile=params[:kml_file][:tempfile]) and (filename=params[:kml_file][:filename])
      redirect '/?msg="missing-file"'
      return
    end
    @filename = filename
    @type     = params[:kml_file][:type]
    @filecontent = tempfile.read
    @tolerance = params[:tolerance]

    erb :uploaded_kml
  end
end
