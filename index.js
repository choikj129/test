const express = require("express");
const app = express();
const mysql = require("mysql2");
const moment = require("moment");
const session = require("express-session");


const connection = mysql.createConnection({
    host : "localhost",
    port : 3306,
    user : "root",
    password : "1111",
    database : "test"
})

app.set("views", __dirname+"/views")
app.set("view engine", "ejs")

app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use(
    session({
        secret : "fkasdjflkdsjaflsfad",
        resave : false,
        saveUninitialized : true,
        maxAge : 3600000
    })
)

const login = require("./routes/login");
app.use("/login", login);

app.listen(3000, function(){
    console.log("monitor server start")
})

app.get("/", function(req, res){
    if(!req.session.logged){
        res.redirect("/login")
    }else{
        if(req.session.logged.linkcode==0){
            res.redirect("/menu")
        }else{
            res.redirect("/search")    
        }   
    }
})

app.get("/menu", function(req, res){
    if(!req.session.logged){
        res.redirect("/")
    }else{
        if(req.session.logged.linkcode==0){
            res.render("index")
        }else{
            res.redirect("/search")
        }
    }
})

app.get("/regist", function(req, res){
    if (!req.session.logged){
        res.redirect("/login")
    }else{
        res.render("regist")
    }
})

app.post("/regist", function(req, res){
    var no = req.body._no;
    var name = req.body._name;
    var address = req.body._address;
    var linkcode = req.body._linkcode;
    console.log(no,name, address);
    connection.query(
        `insert into farm(no, name, address, linkcode) values (?,?,?,?)`,
        [no, name, address, linkcode],
        function(err, result){
            if (err){
                console.log(err)
                res.send("regist SQL insert error")
            }else{
                var sql = "create table farm_history_"+no+`(
                    no int auto_increment primary key,
                    temp int not null,
                    hud int not null,
                    date varchar(45) not null,
                    time varchar(45) not null
                )`
                connection.query(
                    sql,
                    function(err2, result2){
                        if(err2){
                            console.log(err2)
                            res.send("regist SQL create table error")
                        }else{
                            res.redirect("/menu")
                        }
                    }
                )
            }
        }
    )
})

app.get("/search", function(req, res){
    var time = moment().format("YYYY-MM-DD HH:mm:ss")
    var sql;
    if(req.session.logged){
        if (req.session.logged.linkcode==0){
            sql = `select * from farm`
        }else{
            sql = `select * from farm where linkcode=`+req.session.logged.linkcode
        }
        connection.query(
            sql,
            function(err,result){
                if (err){
                    console.log(err)
                    res.send("search SQL select error")
                }else{
                    if(!req.session.logged){
                        res.redirect("/login")
                    }else{
                        res.render("search", {
                            "farm" : result,
                            "time" : time,
                            "linkcode" : req.session.logged.linkcode
                        })
                    }
                }
            }
        )
    }else{
        res.redirect("/")
    }  
})

app.get("/update", function(req, res){
    var time = moment().format("YYYY-MM-DD HH:mm:ss")
    var sql;
    if(req.session.logged){
        if (req.session.logged.linkcode==0){
            sql = `select * from farm`
        }else{
            sql = `select * from farm where linkcode=`+req.session.logged.linkcode
        }
        connection.query(
            sql,
            function(err, result){
                if (err){
                    console.log(err)
                    res.json({
                        "farm" : "error'"
                    })
                }else{
                    res.json({
                        "farm" : result,
                        "time" : time,
                    })
                }
            }
        )
    }else{
        res.redirect("/")
    }  
})

app.post("/update", function(req, res){
    var no = req.body._no;
    var temp = req.body._temp;
    var hud = req.body._hud;
    var date = moment().format("YYYY-MM-DD");
    var time = moment().format("HH:mm:ss")
    console.log(no, temp, hud, date, time)
    connection.query(
        `update farm set temp=?, hud=?, date=?, time=? where no=?`,
        [temp,hud,date,time,no],
        function(err,result){
            if (err){
                console.log(err)
                res.send("update SQL update or insert error")
            }else{
                connection.query(
                    `insert into farm_history_`+no+`(temp, hud, date, time) 
                    values (?,?,?,?)`,
                    [temp,hud,date,time],
                    function(err2,result2){
                        if (err2){
                            console.log(err2)
                            res.send("update SQL insert error")
                        }else{
                            res.send("insert success")
                        }
                    }
                )
            }
        }
    )
})

app.get("/info", function(req, res){
    var farm_no = req.query._farm_no;
    var name = req.query._name;
    console.log(farm_no)
    connection.query(
        `select * from farm_history_`+farm_no+`
        order by date desc, time desc`,
        function(err, result){
            if (err){
                console.log(err)
                res.send("info SQL select error")
            }else{
                var temp="";
                var hud="";
                var time="";
                for (var i=0; i<result.length; i++){
                    time += result[i].date+" / "+result[i].time+",";
                    temp += result[i].temp+",";
                    hud += result[i].hud+","
                }
                res.render("info", {
                    "info" : result,
                    "name" : name,
                    "farm_no" : farm_no,
                    "time" : time.slice(0,-1),
                    "temp" : temp.slice(0,-1),
                    "hud" : hud.slice(0,-1),
                })
            }
        }
    )
})

app.get("/logout", function(req, res){
    req.session.destroy(function(err,result){
        if(err){
            console.log(err)
        }else{
            res.redirect("/")
        }
    })
})