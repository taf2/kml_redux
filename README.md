# KML Google Maps Simplifier

A slimmed down fork of https://github.com/taf2/kml_redux, cleaned up for Ruby 2.0, with features added to help reduce file size as well as complexity.

It uses the Douglas-Peucker algorithm.  From Wikipedia the algorithm is described:

The Douglas–Peucker algorithm is an algorithm for reducing the number of points in a curve that is approximated by a series of points. The initial form of the algorithm was independently suggested in 1972 by Urs Ramer and 1973 by David Douglas and Thomas Peucker. (See the References for more details.) This algorithm is also known under the following names: the Ramer–Douglas–Peucker algorithm, the iterative end-point fit algorithm or the split-and-merge algorithm.

## Running this application - Ruby 2.0

```
bundle install
ruby app.rb
```

And you should see Sinatra start up and run. The application will then be available on [http://localhost:4567](http://localhost:4567).
