const {poolQuery} = require('../helpers')

module.exports = {
  fetchFeeds(req, res) {
    const feedId = Number(req.query.lastFeedId) || 0
    const {filter, limit} = req.query
    let where = 'WHERE timeStamp IS NOT NULL '
    if (feedId !== 0) where += 'AND id < ' + feedId + ' '
    if (filter !== 'undefined' && filter !== 'all') where += 'AND type = "' + filter + '" '
    const query = `
      SELECT id, type, rootType, contentId, rootId, uploaderId, timeStamp FROM noti_feeds
      ${where} AND type != 'like' AND IF(
        rootType = 'video',
        (SELECT id FROM vq_videos WHERE id = rootId),
        IF(
          rootType = 'url',
          (SELECT id FROM content_urls WHERE id = rootId),
          (SELECT id FROM content_questions WHERE id = rootId)
        )
      ) IS NOT NULL ORDER BY id DESC LIMIT ${limit || 21}
    `
    return poolQuery(query).then(
      feeds => res.send(feeds)
    ).catch(
      err => {
        console.error(err)
        return res.status(500).send({error: err})
      }
    )
  }
}
