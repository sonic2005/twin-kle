import PropTypes from 'prop-types'
import React from 'react'

Likers.propTypes = {
  className: PropTypes.string,
  defaultText: PropTypes.string,
  likes: PropTypes.arrayOf(PropTypes.shape({
    userId: PropTypes.number.isRequired,
    username: PropTypes.string.isRequired
  })).isRequired,
  onLinkClick: PropTypes.func.isRequired,
  style: PropTypes.object,
  target: PropTypes.string,
  userId: PropTypes.number
}
export default function Likers({likes, target, userId, onLinkClick, style = null, className, defaultText}) {
  return (
    <div style={style} className={className}>
      {renderLikers()}
    </div>
  )

  function renderLikers() {
    let userLiked = false
    let totalLikes = 0
    if (likes) {
      for (let i = 0; i < likes.length; i++) {
        if (likes[i].userId === userId) userLiked = true
        totalLikes++
      }
    }
    if (userLiked) {
      totalLikes--
      if (totalLikes > 0) {
        if (totalLikes === 1) {
          let otherLikes = likes.filter(like => like.userId !== userId)
          let otherLikerName = otherLikes[0].username
          return (
            <div>
              You and <strong>{otherLikerName}</strong> like {`this${target ? (' ' + target) : ''}.`}
            </div>
          )
        } else {
          return (
            <div>
              You and <strong><a style={{cursor: 'pointer'}}
                onClick={() => onLinkClick()}
              >{totalLikes} others</a></strong> like {`this${target ? (' ' + target) : ''}.`}
            </div>
          )
        }
      }
      return (
        <div>
          You like {`this${target ? (' ' + target) : ''}.`}
        </div>
      )
    } else if (totalLikes > 0) {
      if (totalLikes === 1) {
        const likerName = likes[0].username
        return (
          <div>
            <strong>{likerName}</strong> likes {`this${target ? (' ' + target) : ''}.`}
          </div>
        )
      } else {
        return (
          <div>
            <strong><a style={{cursor: 'pointer'}}
              onClick={() => onLinkClick()}
            >{totalLikes} people</a></strong> like {`this${target ? (' ' + target) : ''}.`}
          </div>
        )
      }
    } else {
      return defaultText ? <div>{defaultText}</div> : null
    }
  }
}
