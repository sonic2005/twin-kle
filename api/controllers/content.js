const express = require('express')
const router = express.Router()
const {requireAuth} = require('../auth')
const {poolQuery} = require('../helpers')
const {fetchedVideoCodeFromURL, processedURL, stringIsEmpty} = require('../helpers/stringHelpers')
const {getThumbImageFromEmbedApi} = require('../helpers/contentHelpers')
const {googleKey} = require('../siteConfig')
const request = require('request-promise-native')

router.delete('/', requireAuth, (req, res) => {
  const {type, contentId} = req.query
  const query = `DELETE FROM ${(type === 'video') ? 'vq_videos' : `content_${type}s`} WHERE id = ?`
  return poolQuery(query, contentId).then(
    () => res.send({success: true})
  ).catch(
    error => {
      console.error(error)
      res.status(500).send({error})
    }
  )
})

router.put('/', requireAuth, (req, res) => {
  const {body: {
    contentId,
    editedComment,
    editedContent,
    editedDescription,
    editedTitle,
    editedUrl,
    type
  }} = req
  let post
  switch (type) {
    case 'comment':
      post = {content: editedComment}
      break
    case 'discussion':
      post = {
        title: editedTitle,
        description: editedDescription
      }
      break
    case 'url':
      post = {
        title: editedTitle,
        description: editedDescription,
        content: processedURL(editedUrl)
      }
      break
    case 'question':
      post = {
        content: editedContent
      }
      break
    case 'video':
      post = {
        title: editedTitle,
        description: editedDescription,
        content: fetchedVideoCodeFromURL(editedUrl)
      }
      break
    default: return res.status(500).send({error: 'Type not specified'})
  }
  const query = `UPDATE ${(type === 'video') ? 'vq_videos' : `content_${type}s`} SET ? WHERE id = ?`
  return poolQuery(query, [post, contentId]).then(
    () => res.send(post)
  ).catch(
    error => {
      console.error(error)
      res.status(500).send({error})
    }
  )
})

router.put('/embed', (req, res) => {
  const {linkId, url} = req.body
  return getThumbImageFromEmbedApi({url}).then(
    (response) => {
      const {image = {url: ''}, title = '', description = '', site = url} = response
      const post = {thumbUrl: image.url, actualTitle: title, actualDescription: description, siteUrl: site}
      poolQuery(`UPDATE content_urls SET ? WHERE id = ?`, [post, linkId])
      res.send(response)
    }
  ).catch(
    error => {
      console.error(error)
      res.status(500).send({error})
    }
  )
})

router.post('/question/like', requireAuth, async(req, res) => {
  try {
    const {user, body: {contentId}} = req
    let query = `SELECT id FROM content_likes WHERE rootType = 'question' AND rootId = ? AND userId = ?`
    const rows = await poolQuery(query, [contentId, user.id])
    if (rows.length > 0) {
      const query = `DELETE FROM content_likes WHERE rootType = 'question' AND rootId = ? AND userId = ?`
      await poolQuery(query, [contentId, user.id])
    } else {
      await poolQuery(`INSERT INTO content_likes SET ?`, {
        rootType: 'question',
        rootId: contentId,
        userId: user.id,
        timeStamp: Math.floor(Date.now() / 1000)
      })
    }
    query = `
      SELECT a.userId, b.username
      FROM content_likes a LEFT JOIN users b ON a.userId = b.id
      WHERE a.rootType = 'question' AND a.rootId = ?
    `
    const likes = await poolQuery(query, contentId)
    res.send({likes})
  } catch (error) {
    console.error(error)
    return res.status(500).send({error})
  }
})

router.get('/search', async(req, res) => {
  const {query} = req.query
  if (stringIsEmpty(query) || query.length < 2) return res.send({result: []})
  const queryWords = query.split(' ').map(word => `+${word} `).join('')
  const params = [queryWords, queryWords]
  const searchQuery = `
    SELECT id, type, title AS label FROM (
      (SELECT id, 'video' AS type, title FROM vq_videos WHERE MATCH(title)
      AGAINST(?IN BOOLEAN MODE))
      UNION
      (SELECT id, 'link' AS type, title FROM content_urls WHERE MATCH(title)
      AGAINST(?IN BOOLEAN MODE))
    ) AS u LIMIT 20
  `
  try {
    let result = await poolQuery(searchQuery, params)
    if (result.length > 0) return res.send({result})
    const alternateQuery = `
      SELECT id, type, title AS label FROM (
        SELECT id, 'video' AS type, title FROM vq_videos
        UNION
        SELECT id, 'link' AS type, title FROM content_urls
      ) AS u WHERE u.title LIKE ? ORDER BY u.id DESC LIMIT 20
    `
    result = await poolQuery(alternateQuery, `%${query}%`)
    return res.send({result})
  } catch (error) {
    console.error(error)
    return res.status(500).send({error})
  }
})

router.put('/videoThumb', (req, res) => {
  const {videoCode, videoId} = req.body
  request({
    uri: `https://www.googleapis.com/youtube/v3/videos`,
    qs: {part: 'snippet', id: videoCode, key: googleKey}
  })
    .then(
      response => {
        const {items} = JSON.parse(response)
        const thumbnails = items.length > 0 ? items[0].snippet.thumbnails : {}
        const payload = thumbnails.maxres ? thumbnails.maxres.url : null
        poolQuery('UPDATE vq_videos SET hasHqThumb = ? WHERE id = ?', [!!payload, videoId])
        res.send({payload})
      }
    ).catch(
      error => {
        console.error(error)
        res.status(500).send({error})
      }
    )
})

module.exports = router
