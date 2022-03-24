const express = require("express");

const bcrypt = require("bcrypt");

const session = require("express-session");

const db = require("./conection/db");

const upload = require("./middlewares/uploadFile");

db.connect(function (err, _, done) {
  if (err) throw err;
  console.log("database conection succes");

  done();
});

const app = express();

const PORT = 5000;

//boolean
const isLogin = true;

let blogs = [];

app.set("view engine", "hbs");

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 5 },
  })
);

app.use("/public", express.static(__dirname + "/public"));

app.use(express.urlencoded({ extended: false }));

app.get("/home", function (req, res) {
  console.log("Session isLogin:", req.session.isLogin);
  console.log("Session user:", req.session.user);

  db.connect(function (err, client, done) {
    let query = "";
    if (req.session.isLogin) {
      query = `SELECT tb_blog.*, tb_user.id AS "user_id", tb_user.name, tb_user.email
      FROM tb_blog LEFT JOIN tb_user 
      ON tb_user.id=tb_blog.author_id WHERE tb_user.id =${req.session.user.id}`;
    } else {
      query = `SELECT tb_blog.*, tb_user.id AS "user_id", tb_user.name, tb_user.email
      FROM tb_blog LEFT JOIN tb_user 
      ON tb_user.id=tb_blog.author_id`;
    }

    client.query(query, function (err, result) {
      if (err) throw err;

      let data = result.rows;

      // console.log(result.rows)

      let addBlogs = data.map(function (data) {
        let user_id = data.user_id;
        let name = data.name;
        let email = data.email;

        delete data.user_id;
        delete data.name;
        delete data.email;

        // let technologies

        // if(data.technologies){
        //   technologies = data.next_js.find(function (blog){
        //     return blog == "technologies"
        //   })

        return {
          ...data,

          postat: duration(new Date(data.startdate), new Date(data.enddate)),
          islogin: req.session.isLogin,
          //  technologies: technologies

          author: {
            user_id,
            name,
            email,
          },
        };
      });
      res.render("home", {
        user: req.session.user,
        isLogin: req.session.isLogin,
        blogs: addBlogs,
      });
    });
  });
});

app.get("/home-delete/:id", function (req, res) {
  let id = req.params.id;

  db.connect(function (err, client, done) {
    if (err) throw err;

    const query = `DELETE FROM tb_blog WHERE id=${id}`;

    client.query(query, function (err, result) {
      if (err) throw err;
    });
    res.redirect("/home");
  });
});

app.get("/edit/:id", function (req, res) {
  let id = req.params.id;
  db.connect(function (err, client, done) {
    if (err) throw err;
    const query = `SELECT * FROM tb_blog WHERE id=${id}`;
    client.query(query, function (err, result) {
      if (err) throw err;

      let data = result.rows[0];

      data = {
        ...data,

        postat: duration(new Date(data.startdate), new Date(data.enddate)),
        startdate: renderDate(data.startdate),
        enddate: renderDate(data.enddate),
      };
      res.render("edit", { edit: data });
    });
  });
});

app.post("edit/:id", function (req, res) {
  let id = req.params.id;

  let blog = req.body;

  db.connect(function (err, client, done) {
    if (err) throw err;
    const query = `UPDATE tb_blog SET (project='${blog.project}', startdate='${blog.startdate}', enddate='${blog.enddate}', description='${blog.description}') WHERE id=${id}`;
    client.query(query, function (err, result) {
      if (err) throw err;

      // let data = result.rows

      // data = {
      //   ...data
      // }
    });
  });
  res.redirect("edit", { blogs: blog });
});

app.get("/form", function (req, res) {
  res.render("form");
});

app.get("/detail/:id", function (req, res) {
  let id = req.params.id;

  db.connect(function (err, client, done) {
    const query = `SELECT tb_blog.*, tb_user.id AS "user_id", tb_user.name, tb_user.email
    FROM tb_blog LEFT JOIN tb_user 
    ON tb_user.id=tb_blog.author_id WHERE tb_blog.id=${id}`;

    client.query(query, function (err, result) {
      if (err) throw err;
      done();

      let data = result.rows[0];
      // console.log(result)

      data = {
        ...data,

        postat: duration(new Date(data.startdate), new Date(data.enddate)),
        newstartdate: newtimestart(data.startdate),
        newenddate: newtimeend(data.enddate),
        author: {
          user_id: data.user_id,
          name: data.name,
          email: data.email,
        },
      };
      delete data.user_id;
      delete data.email;
      delete data.author_id;

      res.render("detail", { blog: data });
    });
  });
});

app.get("/registrasi", function (req, res) {
  res.render("registrasi");
});

app.post("/registrasi", function (req, res) {
  const data = req.body;

  const hashedPassword = bcrypt.hashSync(data.password, 10);

  db.connect(function (err, client, done) {
    if (err) throw err;

    const query = `INSERT INTO tb_user(name,email,password) VALUES('${data.name}','${data.email}','${hashedPassword}')`;
    // console.log(query)

    client.query(query, function (err, result) {
      if (err) throw err;
    });
  });
  res.redirect("/registrasi");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.post("/login", function (req, res) {
  const data = req.body;

  if (data.email == "" || data.password == "") {
    req.flash("error", "Please insert all field!");

    db.connect(function (err, client, done) {
      if (err) throw err;
      const query = `SELECT * FROM tb_user WHERE email = '${data.emai}'`;
      client.query(query, function (err, result) {
        if (err) throw err;

        req.session.isLogin = true;
        req.session.user = {
          id: result.rows[0].id,
          email: result.rows[0].email,
          name: result.rows[0].name,
        };
        console.log(result);

        res.redirect("/blog");
      });
    });
  }

  app.get("/logout", function (req, res) {
    req.session.destroy();
    res.redirect("/home");
  });

  db.connect(function (err, client, done) {
    if (err) throw err;

    const query = `SELECT * FROM tb_user WHERE email='${data.email}'`;
    // console.log(query)

    client.query(query, function (err, result) {
      if (err) throw err;

      // console.log(result.rows)

      //check account email
      if (result.rows.length == 0) {
        console.log("email not found!");
        return res.redirect("/login");
      }
      // check password
      const isMatch = bcrypt.compareSync(data.password, result.rows[0].password);

      if (isMatch == false) {
        console.log("wrong password");
        return res.redirect("/login");
      }

      req.session.isLogin = true;
      req.session.user = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name,
      };

      // console.log('pasword check:', isMatch)
      res.redirect("/home");
    });
  });
});

app.post("/detail/:id", function (req, res) {
  let id = req.params.id;

  res.render("detail");
});

app.get("/blog", function (req, res) {
  res.render("blog");
});

app.post("/blog", upload.single("image"), function (req, res) {
  let blog = req.body;
  // blog.postAt = duration(new Date (blog.start_date), (new Date(blog.end_date)));
  blog.newstartdate = newtimestart(blog.startdate);
  blog.newenddate = newtimeend(blog.enddate);

  db.connect(function (err, client, done) {
    if (err) throw err;
    // done();

    const query = `INSERT INTO tb_blog (project, startdate, enddate, description, author_id) 
    VALUES ('${blog.project}', '${blog.startdate}', '${blog.enddate}', '${blog.description}', '${req.session.user.id}')`;
    // console.log(query)

    client.query(query, function (err, result) {
      // if (err) throw err;
      // done();

      console.log(result);
    });
    res.redirect("/home");
  });
  // blogs.push(blog);

  // console.log(blog);

  // res.redirect("/home");
});

app.listen(PORT, function (enddate, startdate) {
  console.log(`server starting on port : ${PORT}`);
});

function duration(startdate, enddate) {
  let distance = new Date(enddate) - new Date(startdate);

  let monthdistance = Math.floor(distance / (30 * 24 * 60 * 60 * 1000));

  if (monthdistance != 0) {
    return monthdistance + " bulan";
  } else {
    let daydistance = Math.floor(distance / (24 * 60 * 60 * 1000));

    if (daydistance != 0) {
      return daydistance + " hari";
    }
  }
}

function newtimestart(startdate) {
  let monthIndex = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "Desember"];
  let getstartdate = new Date(startdate);

  let date = getstartdate.getDate();
  let month = getstartdate.getMonth();
  let year = getstartdate.getFullYear();

  return `${date} ${monthIndex[month]} ${year}`;
}

function newtimeend(enddate) {
  let monthIndex = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "Desember"];
  let getenddate = new Date(enddate);

  let date = getenddate.getDate();
  let month = getenddate.getMonth();
  let year = getenddate.getFullYear();

  return `${date} ${monthIndex[month]} ${year}`;
}

function renderDate(time) {
  let hari = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"];

  let bulan = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

  let date = time.getDate();
  let monthIndex = time.getMonth();
  let year = time.getFullYear();

  let fullTime = `${year}-${bulan[monthIndex]}-${hari[date]}`;

  return fullTime;
}
