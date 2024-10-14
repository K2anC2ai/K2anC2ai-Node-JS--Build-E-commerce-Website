var express = require('express');
var ejs = require('ejs');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var session = require('express-session');



const app = express();




app.listen(8080);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(session({secret: "secret",resave:false,saveUninitialized:false,}));

mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'node_project'

});


app.get('/', function(req, res){

    var con = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'node_project'
    
    });

    con.query("SELECT * FROM products",(err,result)=>{
        res.render('pages/index',{result: result});
    })
    



});