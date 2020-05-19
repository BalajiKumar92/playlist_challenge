var path = require('path');
var express = require('express');
var slashes = require('connect-slashes');
var cors = require('cors');
var Songs = require('./songs');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');

var STATIC_DIR = path.join(__dirname, '../client/build');

module.exports = function createApp(options) {
    var library = new Songs(path.join(__dirname, '..', 'data'));

    var app = express();
    app.use(express.logger());
    app.use(express.bodyParser());
    app.use(express.static(STATIC_DIR));
    app.use(slashes(false));

    app.use(cors());

    var schema = buildSchema(`
    type Song {
        album: String
        duration: Int
        title: String
        id: Int
        artist: String
    }  
    type Playlist {
        id: Int!
        name: String!
        songs: [String!]!     
    }
    type CreateResult {
        id: Int        
    }

    type Query {
      getSongs: [Song]
      getSongById(SongId: Int): Song
      getFilterSong(SearchParam: String, SearchValue: String): [Song]
      getPlayLists: [Playlist]
      getPlayList(PlayListId: Int): Playlist
    }

    type Mutation {
        createPlayList(name: String! songs:[Int!]!): CreateResult
        deletePlayList(id: Int!): Int
      }
  `);
    var root = {
        deletePlayList: ({ id }) => {
            library.deletePlaylist(id);
            return 200
        },
        createPlayList: ({ name, songs }) => {
            let data = new Promise(function (resolve, reject) {
               return library.savePlaylist(null, name, songs, function (err, id) {
                   resolve({
                        id: id
                    })
                });
            });
            return data
        },
        getPlayList: ({ PlayListId }) => {
            var data = library.getPlaylist(PlayListId);
            return data
        },
        getPlayLists: () => {
            let data = new Promise(function (resolve, reject) {
                return library.getPlaylists((err, playlists) => {
                    resolve(playlists)
                });
            });
            return data
        },
        getSongs: () => {
            var data = library.getLibrary();
            return data;
        },
        getSongById: ({ SongId }) => {
            var data = library.getSong(SongId);
            return data;
        },
        getFilterSong: ({ SearchParam, SearchValue }) => {
            var data = library.getLibrary();
            let result
            switch (SearchParam) {
                case "album":
                    {
                        result = data.filter(d => {
                            return d.album.toLowerCase().includes(SearchValue)
                        })
                        break;
                    }
                case "duration":
                    {
                        result = data.filter(d => {
                            return d.duration === SearchValue
                        })
                        break;
                    }
                case "title":
                    {
                        result = data.filter(d => {
                            return d.title.toLowerCase().includes(SearchValue)
                        })
                        break;
                    }
                case "id":
                    {
                        result = data.filter(d => {
                            return d.title === SearchValue
                        })
                        break;
                    }
                case "artist":
                    {
                        result = data.filter(d => {
                            return d.artist.toLowerCase().includes(SearchValue)
                        })
                        break;
                    }
                default:
                    {
                        result = data
                    }
            }
            return result;
        }
    }

    app.use('/graphql', graphqlHTTP({
        schema: schema,
        rootValue: root,
        graphiql: true,
    }));

    app.get('/library', function (req, res) {
        var data = library.getLibrary();
        res.json(data);
    });

    app.get('/library/:id', function (req, res) {
        var id = parseInt(req.params.id, 10);
        var data = library.getSong(id);

        res.json(data);
    });

    app.get('/playlist', function (req, res) {
        var data = library.getPlaylists(function (err, playlists) {
            res.json(playlists);
        });
    });

    app.post('/playlist', function (req, res) {
        var data = req.body;

        console.dir(data)
        console.dir(req.headers);

        var name = data.name
        var songs = data.songs

        library.savePlaylist(null, name, songs, function (err, id) {
            res.json({
                id: id
            });
        });
    });

    app.get('/playlist/:id', function (req, res) {
        var id = parseInt(req.params.id, 10);
        var data = library.getPlaylist(id);

        res.json(data);
    });

    app.post('/playlist/:id', function (req, res) {
        var id = parseInt(req.params.id, 10);
        var data = req.body;

        var name = data.name
        var songs = data.songs

        library.savePlaylist(id, name, songs, function (err, id) {
            res.json({
                id: id
            });
        });
    });

    app.delete('/playlist/:id', function (req, res) {
        var id = parseInt(req.params.id, 10);
        var data = library.deletePlaylist(id);
        res.status(200);
        res.json({});
    });

    return app;
};