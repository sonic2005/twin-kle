"use strict"

const pool = require('../siteConfig').pool;
const requireAuth = require('../auth').requireAuth;

const fetchChat = require('../helpers/ChatHelper').fetchChat;
const fetchChannels = require('../helpers/ChatHelper').fetchChannels;
const handleCaseWhereBidirectionalChatAlreadyExists = require('../helpers/ChatHelper').handleCaseWhereBidirectionalChatAlreadyExists;
const updateLastRead = require('../helpers/ChatHelper').updateLastRead;

const processedString = require('../helpers/StringHelper').processedString;
const processedTitleString = require('../helpers/StringHelper').processedTitleString;

const async = require('async');
const express = require('express');
const router = express.Router();
const defaultChatroomId = 2;

router.get('/', requireAuth, (req, res) => {
  const user = req.user;
  const lastChatRoomId = user.lastChatRoom || defaultChatroomId;
  fetchChat({user, channelId: lastChatRoomId}, (err, results) => {
    if (err) {
      console.error(err);
      if (err.status) return res.status(err.status).send({error: err})
      return res.status(500).send({error: err})
    }
    res.send({
      channels: results[0],
      messages: results[1],
      currentChannel: results[2]
    })
  })
})

router.post('/', requireAuth, (req, res) => {
  const user = req.user;
  const params = req.body.params;
  if (params.userid !== user.id) {
    return res.status(401).send("Unauthorized")
  }
  const timeposted = Math.floor(Date.now()/1000);
  const post = {
    roomid: params.channelId,
    userid: user.id,
    content: processedString(params.content),
    timeposted
  }

  pool.query('SELECT COUNT(*) AS num FROM msg_lastRead WHERE userId = ? AND channel = ?', [user.id, params.channelId], (err, rows) => {
    if(Number(rows[0].num) > 0) {
      pool.query('UPDATE msg_lastRead SET ? WHERE userId = ? AND channel = ?', [{timeStamp: timeposted}, user.id, params.channelId]);
    } else {
      pool.query('INSERT INTO msg_lastRead SET ?', {userId: user.id, channel: params.channelId, timeStamp: timeposted});
    }
  })

  async.waterfall([
    callback => {
      pool.query('INSERT INTO msg_chats SET ?', post, (err, result) => {
        callback(err, result.insertId)
      })
    },
    (insertId, callback) => {
      fetchChannels(user, (err, channels) => {
        callback(err, {
          messageId: insertId,
          timeposted,
          channels
        })
      })
    }
  ], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send(err)
    }
    res.send(results)
  })
})

router.get('/more', requireAuth, (req, res) => {
  const user = req.user;
  if (Number(req.query.userId) !== user.id) {
    return res.status(401).send("Unauthorized")
  }
  const messageId = req.query.messageId;
  const roomId = req.query.roomId;
  const query = [
    'SELECT a.id, a.roomid, a.userid, a.content, a.timeposted, a.isNotification, b.username FROM ',
    'msg_chats a JOIN users b ON a.userid = b.id ',
    'WHERE a.id < ? AND a.roomid = ? ORDER BY id DESC LIMIT 21'
  ].join('');
  pool.query(query, [messageId, roomId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send({error: err})
    }
    res.send(rows)
  })
})

router.get('/numUnreads', requireAuth, (req, res) => {
  const user = req.user;
  async.waterfall([
    callback => {
      pool.query('SELECT channel, timeStamp FROM msg_lastRead WHERE userId = ?', user.id, (err, lastReads) => {
        callback(err, lastReads)
      })
    },
    (lastReads, callback) => {
      let query = [
        'SELECT roomid, timeposted FROM msg_chats WHERE roomid IN ',
        '(SELECT roomid FROM msg_chatroom_members WHERE userid = ?)'
      ].join('')
      pool.query(query, user.id, (err, messages) => {
        let counter = 0;
        for (let i = 0; i < lastReads.length; i++) {
          const channel = lastReads[i].channel;
          const timeStamp = Number(lastReads[i].timeStamp);
          for (let j = 0; j < messages.length; j++) {
            if (Number(messages[j].roomid) === Number(channel) && messages[j].timeposted > timeStamp) {
              counter ++
            }
          }
        }
        let readChannels = lastReads.map(lastRead => {
          return String(lastRead.channel);
        })
        let messagesInUnreadChannel = messages.filter(message => {
          return (readChannels.indexOf(String(message.roomid)) === -1)
        })
        counter += messagesInUnreadChannel.length;
        callback(err, counter)
      })
    }
  ], (err, numUnreads) => {
    if (err) {
      console.error(err);
      return res.status(500).send({error: err})
    }
    res.send({numUnreads})
  })
})

router.get('/channel', requireAuth, (req, res) => {
  const user = req.user;
  const channelId = req.query.channelId;
  async.waterfall([
    callback => {
      fetchChat({user, channelId}, (err, results) => {
        if (err) return callback(err);
        callback(err, results[1])
      })
    },
    (messages, callback) => {
      pool.query('UPDATE users SET ? WHERE id = ?', [{lastChatRoom: channelId}, user.id], (err) => {
        callback(err, messages)
      })
    }
  ], (err, messages) => {
    if (err) {
      console.error(err);
      if (err.status) return res.status(err.status).send({error: err})
      return res.status(500).send({error: err})
    }
    pool.query('SELECT bidirectional, creator FROM msg_chatrooms WHERE id = ?', channelId, (err, rows) => {
      res.send({
        currentChannel: {
          id: channelId,
          bidirectional: Boolean(rows[0].bidirectional),
          creatorId: rows[0].creator
        },
        messages
      })
    })
  })
})

router.get('/channel/check', requireAuth, (req, res) => {
  let partnerId = req.query.partnerId;
  let myUserId = req.user.id;
  const query = [
    'SELECT * FROM msg_chatrooms WHERE ',
    '(memberOne = '+partnerId+' AND memberTwo = '+myUserId+') OR ',
    '(memberOne = '+myUserId+' AND memberTwo = '+partnerId+')'
  ].join('');
  pool.query(query, (err, rows) => {
    if (err) {
      console.error(err)
      return res.status(500).send({error: err})
    }
    res.send({
      channelExists: rows.length > 0,
      channelId: rows.length > 0 ? rows[0].id : null
    })
  })
})

router.post('/lastRead', requireAuth, (req, res) => {
  const user = req.user;
  const channelId = req.body.channelId;
  const timeposted = req.body.timeposted;

  pool.query('SELECT COUNT(*) AS num FROM msg_lastRead WHERE userId = ? AND channel = ?', [user.id, channelId], (err, rows) => {
    if(Number(rows[0].num) > 0) {
      pool.query('UPDATE msg_lastRead SET ? WHERE userId = ? AND channel = ?', [{timeStamp: timeposted}, user.id, channelId]);
    } else {
      pool.query('INSERT INTO msg_lastRead SET ?', {userId: user.id, channel: channelId, timeStamp: timeposted});
    }
  })
})

router.post('/channel', requireAuth, (req, res) => {
  const user = req.user;
  const params = req.body.params;
  const roomname = processedTitleString(params.channelName);
  const time = Math.floor(Date.now()/1000);

  async.waterfall([
    callback => {
      pool.query('INSERT INTO msg_chatrooms SET ?', {roomname}, (err, result) => {
        callback(err, result.insertId)
      })
    },
    (channelId, callback) => {
      const members = [user.id].concat(params.selectedUsers.map(user => {
        return user.userId
      }));
      let taskArray = [];
      for (let i = 0; i < members.length; i++) {
        let task = callback => {
          let post = {
            roomid: channelId,
            userid: members[i]
          }
          pool.query('INSERT INTO msg_chatroom_members SET ?', post, (err, result) => {
            callback(err, result)
          })
        }
        taskArray.push(task);
      }
      taskArray.push(
        callback => {
          let message = {
            roomid: channelId,
            userid: user.id,
            content: `Created channel "${roomname}"`,
            timeposted: time,
            isNotification: true
          }
          pool.query('INSERT INTO msg_chats SET ?', message, (err, result) => {
            message = Object.assign({}, message, {
              username: user.username,
              messageId: result.insertId,
              roomname
            });
            callback(err, message)
          })
        }
      )
      async.parallel(taskArray, (err, results) => {
        callback(err, results[results.length - 1])
      })
      updateLastRead({userId: user.id, channelId, time})
    },
    (message, callback) => {
      const roomId = message.roomid;
      pool.query('UPDATE users SET ? WHERE id = ?', [{lastChatRoom: roomId}, user.id], err => {
        callback(err, message)
      })
    }
  ], (err, message) => {
    if (err) {
      console.error(err);
      return res.status(500).send({error: err})
    }
    res.send({message})
  })
})

router.post('/channel/bidirectional', requireAuth, (req, res) => {
  const user = req.user;
  const partnerId = req.body.chatPartnerId;
  const firstMessage = processedString(req.body.message);
  if (user.id !== req.body.userId) {
    return res.status(401).send({error: "Session mismatch"})
  }
  async.waterfall([
    callback => {
      let query = [
        'SELECT * FROM msg_chatrooms WHERE ',
        '(memberOne = '+user.id+' AND memberTwo = '+partnerId+') OR ',
        '(memberOne = '+partnerId+' AND memberTwo = '+user.id+')'
      ].join('')
      pool.query(query, (err, rows) => {
        if (rows.length > 0) {
          let params = [rows[0].id, user.id, firstMessage];
          return handleCaseWhereBidirectionalChatAlreadyExists(...params, (err, result) => {
            if (err) res.status(500).send({error: err});
            res.send({alreadyExists: result});
          });
        }
        callback(null)
      })
    },
    callback => {
      let post = {
        bidirectional: true,
        memberOne: user.id,
        memberTwo: partnerId
      }
      pool.query('INSERT INTO msg_chatrooms SET ?', post, (err, result) => {
        callback(err, result.insertId)
      })
    },
    (insertId, callback) => {
      const members = [user.id, partnerId];
      let taskArray = [];
      for (let i = 0; i < members.length; i++) {
        let task = callback => {
          let post = {
            roomid: insertId,
            userid: members[i]
          }
          pool.query('INSERT INTO msg_chatroom_members SET ?', post, (err, result) => {
            callback(err, result)
          })
        }
        taskArray.push(task);
      }
      let post = {
        roomid: insertId,
        userid: user.id,
        content: firstMessage,
        timeposted: Math.floor(Date.now()/1000)
      }
      let finalTask = callback => pool.query('INSERT INTO msg_chats SET ?', post, (err, result) => {
        callback(err, result.insertId)
      })
      taskArray.push(finalTask);
      async.series(taskArray, (err, results) => {
        callback(err, insertId, results[results.length-1])
      })
    },
    (roomId, messageId, callback) => {
      pool.query('UPDATE users SET ? WHERE id = ?', [{lastChatRoom: roomId}, user.id], err => {
        callback(err, roomId, messageId)
      })
    }
  ], (err, roomId, messageId) => {
    if (err) {
      console.error(err);
      return res.status(500).send({error: err})
    }
    res.send({
      messageId: String(messageId),
      roomid: String(roomId),
      userid: String(user.id),
      username: user.username,
      content: firstMessage,
      timeposted: Math.floor(Date.now()/1000)
    })
  })
})

router.get('/search', (req, res) => {
  const text = req.query.text;
  const query = 'SELECT * FROM users WHERE (username LIKE ?) OR (realname LIKE ?) LIMIT 5';
  pool.query(query, [text + '%', text + '%'], (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send({error: err})
    }
    res.send(rows)
  })
})

module.exports = router;
