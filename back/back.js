const { buildSchema } = require('graphql');
const express = require('express')
const cors = require('cors');
const bodyParser = require('body-parser');
const expressJwt = require('express-jwt');
const jwt = require('jsonwebtoken');
const express_graphql = require('express-graphql')
const Sequelize = require('sequelize');


const app = express();//исп. как каркаса


require('sequelize-hierarchy')(Sequelize);
const sequelize = new Sequelize('mysql://root:vjq yjvth 245@localhost/My_Motivation');//связываем с БД

// sequelize model************************************************ 

class User extends Sequelize.Model{}
User.init({
    first_name: Sequelize.STRING,
    last_name: Sequelize.STRING,
    login: Sequelize.STRING,
    password: Sequelize.STRING,
    country: Sequelize.STRING,
    city: Sequelize.STRING,
    'createdAt': { //время создания
        type: Sequelize.DATE(3),
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)'),
    },
    'updatedAt': { //время обновления
        type: Sequelize.DATE(3),
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)'),
    },
},{sequelize, modelName:'user'})//Название в БД


class Post extends Sequelize.Model{}
Post.init({
    title: Sequelize.STRING,
    text: Sequelize.STRING,
    value: Sequelize.STRING,
    imgSource: Sequelize.STRING,
    'createdAt': {
        type: Sequelize.DATE(3),
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)'),
    },
    'updatedAt': {
        type: Sequelize.DATE(3),
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)'),
    },
}, {sequelize,modelName:'post'})


class TestResult extends Sequelize.Model{}
TestResult.init({
    text: Sequelize.STRING,
},{sequelize, modelName:'test_result'})

class Glossary extends Sequelize.Model{}
Glossary.init({
    word:Sequelize.STRING,
    meaning:Sequelize.STRING,
},{sequelize, modelName:'glossary'})

//Connections

User.hasMany(Post)
Post.belongsTo(User)

User.hasMany(TestResult)
TestResult.belongsTo(User)

User.hasOne(Glossary)

;(async () => {
    await sequelize.sync()
})()  //запуск

// GraphQL********************************************************************

var schema = buildSchema(`
    type Query{
        getUser(id:Int!) : [User]
        getPosts: [Post]
        getWords: [Glossary]
    }
    type Mutation{ 
        createUser(first_name:String!, last_name:String!, login:String!, password:String!, country:String!, city:String!) : User
        createPost(title:String!, text:String!, value:String!, imgSource:String!) : Post
        createWord(word:String!, meaning:String!) : Glossary
    }
    type User {
        id: Int
        userId: Int
        first_name: String
        last_name: String
        login: String
        password: String
        country: String
        city: String
        createdAt: String
        updatedAt: String
    }
    type Post{
        id: Int
        title: String
        text: String
        value: String
        imgSource: String
    }
    type Glossary{
        id: Int
        word: String
        meaning: String
    }
`)

// RESOLVER FOR USER
const getUser = async({id}, context) => {
    console.log(id)
    return await User.findAll({where: {id} })
}

const createUser = async({first_name, last_name, login, password, country, city}, context) => {
    console.log(first_name)
    console.log(last_name)
    console.log(login)
    console.log(password)
    console.log(country)
    console.log(city)
    console.log('user was created!!!!!!!')

    var res = await User.create({first_name, last_name, login, password, country, city})
    return res
}

//резолверы (controllers) для Post********************************************************************
async function createPost({title,text,value, imgSource}, context){
    var res = await Post.create({title,text,value,imgSource})
    return res
}

async function getPosts(){
    let x = await Post.findAll()
    x.sort(function(a,b){
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    return x
}
//резолверы для Word********************************************************************
async function createWord({word, meaning}, context){
    console.log(context)
    var res = await Glossary.create({word, meaning})
    return res
}

async function getWords(){
    let x = await Glossary.findAll()
    x.sort(function(a,b){
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    return x
}

var root = { //активация резолверов
    getUser,
    createUser,
    createPost,
    getPosts,
    createWord,
    getWords
}

// app.use('/graphql', express_graphql(async (req, res, gql) => { //активация
//         return {
//             schema: schema, //активация схема
//             rootValue: root, //и резолверы
//             graphiql: true, 
//         }
//   }))


app.use('/graphql', express_graphql(async (req, res, gql) => { 
    const authorization = req.headers.authorization 

    console.log(authorization);

    if (authorization && authorization.startsWith('Bearer')){ //если есть токен
        console.log('token provided')
        const token = authorization.substr("Bearer ".length)
        console.log(token)
        const decoded = jwt.verify(token, config.secret) //проверяем подпись
        console.log(decoded)
        if (decoded){
            console.log('token verified', decoded)
            //let slicedModels  = await getModels(decoded.sub.id) //любая функция, которая готовит контекст для резолвера
            console.log('-------------------');
            console.log(decoded.sub);
            return {
                schema: schema,
                rootValue: root,
                graphiql: true, 
                context: {jwt: decoded.sub}//, //в контекст отдаем токен
                          //models: slicedModels} //и, например, объект из ORM/ODM текущего пользователя со всей нужной информацией 
            }
        }
    }
    else { //если токена нет
        return {
            schema: schema, // работают анонимные схема
            rootValue: root, // и резолверы
            graphiql: true, 
        }
    }
  }))

  // ____________________JWT________________________________
const config = {
    secret: `vjqyjvth245` //тот самый секретный ключ, которым подписывается каждый токен, выдаваемый клиенту
}

function jwtWare() {
    const { secret } = config;
    return expressJwt({ secret }).unless({ //будет доступ к приватным роутам
        path: [
            // public routes that don't require authentication
            '/users/authenticate'
        ]
    });
}

function errorHandler(err, req, res, next) {
    if (typeof (err) === 'string') {
        // custom application error
        return res.status(400).json({ message: err });
    }

    if (err.name === 'UnauthorizedError') { //отлавливает ошибку, высланную из expressJwt
        // jwt authentication error
        return res.status(401).json({ message: 'Invalid Token' });
    }

    // default to 500 server error
    return res.status(500).json({ message: err.message });
}


// мо
async function authenticate({ login, password }) { //контроллер авторизации
    console.log(login, password)
    const user = await User.findOne({where: {login,password}});
    console.log(user)
    if (user) {        
        const token = jwt.sign({ sub: user.id }, config.secret); //подписывам токен нашим ключем
        console.log(token)
        return { //отсылаем интересную инфу
            token
        };
    }
}


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
// use JWT auth to secure the api

// api routes
app.post('/users/authenticate', function (req, res, next) {
    authenticate(req.body)
        .then(user => user ? res.json(user) : res.status(400).json({ message: 'Username or password is incorrect' }))
        .catch(err => next(err));
});

app.use(jwtWare());


// ______________BOTTOM___________________________
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.get('/', (req, res, next) => {
    res.json({all: 'ok'})
})

app.use(errorHandler);

//подключаем наш бэк на 8000-й порт
app.listen(8000, `0.0.0.0`, () => console.log(`
░░░░░░░░░░░░░░░░░░░░░░░▄▄
░░░░░░░░░░░░░░░░░░░░░▄▀░░▌
░░░░░░░░░░░░░░░░░░░▄▀▐░░░▌
░░░░░░░░░░░░░░░░▄▀▀▒▐▒░░░▌
░░░░░▄▀▀▄░░░▄▄▀▀▒▒▒▒▌▒▒░░▌
░░░░▐▒░░░▀▄▀▒▒▒▒▒▒▒▒▒▒▒▒▒█
░░░░▌▒░░░░▒▀▄▒▒▒▒▒▒▒▒▒▒▒▒▒▀▄
░░░░▐▒░░░░░▒▒▒▒▒▒▒▒▒▌▒▐▒▒▒▒▒▀▄
░░░░▌▀▄░░▒▒▒▒▒▒▒▒▐▒▒▒▌▒▌▒▄▄▒▒▐
░░░▌▌▒▒▀▒▒▒▒▒▒▒▒▒▒▐▒▒▒▒▒█▄█▌▒▒▌
░▄▀▒▐▒▒▒▒▒▒▒▒▒▒▒▄▀█▌▒▒▒▒▒▀▀▒▒▐░░░▄
▀▒▒▒▒▌▒▒▒▒▒▒▒▄▒▐███▌▄▒▒▒▒▒▒▒▄▀▀▀▀
▒▒▒▒▒▐▒▒▒▒▒▄▀▒▒▒▀▀▀▒▒▒▒▄█▀░░▒▌▀▀▄▄
▒▒▒▒▒▒█▒▄▄▀▒▒▒▒▒▒▒▒▒▒▒░░▐▒▀▄▀▄░░░░▀
▒▒▒▒▒▒▒█▒▒▒▒▒▒▒▒▒▄▒▒▒▒▄▀▒▒▒▌░░▀▄
▒▒▒▒▒▒▒▒▀▄▒▒▒▒▒▒▒▒▀▀▀▀▒▒▒▄▀
▒▒▒▒▒▒▒▒▒▒▀▄▄▒▒▒▒▒▒▒▒▒▒▒▐
▒▒▒▒▒▒▒▒▒▒▒▒▒▀▀▄▄▄▒▒▒▒▒▒▌
▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▐
▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▐

SERVER TURNED 'ON'!
`))