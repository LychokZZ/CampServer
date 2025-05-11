// index.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./User');
const MessageModel = require('./Message');


const { createServer } = require('node:http');
const { Server } = require('socket.io');

const app = express();
const PORT = 3000;

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3001 , https://lychokzz.github.io/CampFront/',
    methods: ['GET', 'POST'],
    credentials: true,
  }
});


app.use(cors({
  origin: 'http://localhost:3001 , https://lychokzz.github.io/CampFront/', // адрес твоего фронтенда
  credentials: true,               // если нужны cookies или авторизация по токену
}));
app.use(express.json());


mongoose.connect(`mongodb+srv://admin:admin@cluster0.m4azltl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB подключена'))
.catch((err) => console.error('Ошибка подключения к MongoDB:', err));


const activeRooms = {}; // ВЫНЕСТИ наружу, чтобы сохранялось между событиями

io.on('connection', (socket) => {
  console.log(`Пользователь ${socket.id} подключён`);

  socket.on('start-chat', ({ roomName }) => {
    if (!roomName) {
      socket.emit('error', 'Название комнаты не передано');
      return;
    }

    // Инициализируем комнату, если она ещё не существует
    if (!activeRooms[roomName]) {
      activeRooms[roomName] = new Set();
    }

    const room = activeRooms[roomName];

    // Проверяем, если пользователь уже в комнате
    if (room.has(socket.id)) {
      socket.emit('info', 'Вы уже в комнате');
      return;
    }

    // Проверка на заполненность комнаты
    if (room.size >= 2) {
      socket.emit('error', 'Комната уже заполнена двумя участниками');
      return;
    }

    room.add(socket.id); // Добавляем пользователя в комнату
    socket.join(roomName); // Подключаем к комнате
    console.log(`Пользователь ${socket.id} подключён к комнате ${roomName}`);
    socket.emit('info', `Вы подключены к комнате ${roomName}`);
  });

  socket.on('chat message', async (data) => {
    const { message, room, sender, reciver } = data;
  
    console.log(message);
  
    if (!message || !room || !sender || !reciver) {
      socket.emit('error', 'Некорректные данные для сообщения');
      return;
    }
    (async () => {
      /*const fetch = (await import('node-fetch')).default;*/
    
      const polych = reciver;
    
      if (reciver === "Bob" || reciver === "Regina Lavaren" || reciver === "Alex") {
        /*const response = await fetch('https://api.quotable.io/random');
        const data = await response.json();
        const quote = `${data.content} — ${data.author}`;*/ 
    
        io.to(room).emit('chat message', {
          message: ' Привет (Це повідомлення надіслано ботом, воно зникне після перезавантаження)',
          room,
          sender: polych,
          reciver
        });
      }
    })();

    try {
      await MessageModel.create({
        content: message,
        room,
        sender,
        reciver,
        timestamp: new Date(),
      });
  
      if (activeRooms[room]?.has(socket.id)) {
        io.to(room).emit('chat message', { message, room, sender, reciver });
      } else {
        socket.emit('error', 'Вы не в этой комнате!');
      }
    } catch (err) {
      console.error('Ошибка при сохранении сообщения:', err);
      socket.emit('error', 'Ошибка при сохранении сообщения в базу данных');
    }
  });
  
});


app.get('/messages', async (req, res) => {
  const { user1, user2 } = req.query;

  const messages = await MessageModel.find({
    $or: [
      { sender: user1, reciver: user2 },
      { sender: user2, reciver: user1 },
    ],
  }).sort({ timestamp: 1 }); 

  res.json(messages);
});


app.post('/registration',async(req,res)=> {
  try {
    const user = await User.create(req.body)
    res.status(201).json(user);
  }catch (error) {
    res.status(400).json({ error: error.message });
  }
})

app.post('/login',async(req,res)=>{
  try {
    const {username,password} = req.body
    const user = await User.findOne({username})
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if(user.password !== password){
      return res.status(401).json({ error: 'Неверный пароль' });
    }
    res.status(201).json('Sucesful');
  }catch (err) {
    res.status(400).json({ error: err.message });
  }
})

app.post('/addfriend',async(req,res)=>{
  const {username ,friendname} = req.body
  const user = await User.findOne({username: username})
  const friend = await User.findOne({username: friendname})
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  if (!friend) {
    return res.status(404).json({ error: 'Друг не найден' });
  }

  user.friendList.push(friendname)
  await user.save()


  res.status(201).json('Sucesful add frined');
})

app.get('/getfriend/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    return res.status(200).json(user.friendList);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.post('/deletefriend',async(req,res)=> {
  try {
    const {username,friendname} = req.body
    const user = await User.findOne({username})
    user.friendList = user.friendList.filter(friend => friend !== friendname);


    await user.save();
    
    res.json({ message: 'Friend removed successfully', friendList: user.friendList });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
})

app.post('/addfriend',async(req,res)=>{
  try {
    const {username,friendname} = req.body
    const user = await User.findOne({username})

    user.friendList= user.friendList.push(friendname)
    await user.save();
    res.json({ message: 'Friend add successfully', friendList: user.friendList });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
})


app.get('/searchuser/:searchFr',async(req,res)=>{
  try {
    const searchFr = req.params.searchFr
    const friend = await User.findOne({username:searchFr})
    return res.status(200).json(friend.username);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
})

server.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});

