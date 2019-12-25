const express = require('express');
const bodyParser = require('body-parser');
const express_graphql = require('express-graphql');
const { buildSchema } = require('graphql');
const Sequelize = require('sequelize');


const app = express();


require('sequelize-hierarchy')(Sequelize);
const sequelize = new Sequelize('mysql://root:vjq yjvth 245@localhost/My_Motivation');//связываем с БД

// sequelize model************************************************ 

class User extends Sequelize.Model{}
User.init({
    username: Sequelize.STRING,
    surname: Sequelize.STRING,
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
        getPosts: [Post]
        getWords: [Glossary]
    }
    type Mutation{ 
        createPost(title:String!, text:String!, value:String!, imgSource:String!) : Post
        createWord(word:String!, meaning:String!) : Glossary
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
//резолверы (controllers) для Post********************************************************************
async function createPost({title,text,value, imgSource}, context){
    console.log(context)
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
    createPost,
    getPosts,
    createWord,
    getWords
}

app.use('/graphql', express_graphql(async (req, res, gql) => { //активация
        return {
            schema: schema, //работают анонимные схема
            rootValue: root, //и резолверы
            graphiql: true, 
        }
  }))


  function errorHandler(err, req, res, next) {
    if (typeof (err) === 'string') {
        // custom application error
        return res.status(400).json({ message: err });
    }
    // default to 500 server error
    return res.status(500).json({ message: err.message });
}


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());







//активация Bсего бэка
app.get('/', (req, res, next) => {
    res.json({all: 'ok'})
});
//активация функции ошибок
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