import React, { Component } from 'react';
import Carousel from 'nuka-carousel';
import VideoThumb from './VideoThumb';
import SmallDropdownButton from './SmallDropdownButton';
import EditTitleForm from './EditTitleForm';
import { editPlaylistTitle } from 'actions/PlaylistActions';
import EditPlaylistModal from 'containers/PlaylistModals/EditPlaylistModal';

export default class PlaylistCarousel extends Component {
  state = {
    onEdit: false,
    editPlaylistModalShown: false
  }

  renderThumbs () {
    const { playlist } = this.props;
    return playlist.map(thumb => {
      return (
        <VideoThumb
          key={playlist.indexOf(thumb)}
          video={{
            videocode: thumb.videocode,
            title: thumb.video_title,
            uploadername: thumb.video_uploader
          }}
        />
      )
    })
  }

  onEditTitle() {
    this.setState({onEdit: true})
  }

  onChangeVideos() {
    this.props.openChangePlaylistVideosModal();
    this.setState({editPlaylistModalShown: true});
  }

  onReorderVideos() {
    const playlistVideos = this.props.playlist;
    this.props.openReorderPlaylistVideosModal(playlistVideos);
    this.setState({editPlaylistModalShown: true});
  }

  onEditedTitleSubmit(props) {
    const { title, editPlaylistTitle } = this.props;
    props['playlistId'] = this.props.playlistId;
    if (props.title && props.title !== title) {
      editPlaylistTitle(props, this.props.arrayNumber);
    }
    this.setState({onEdit: false})
  }

  onEditTitleCancel() {
    this.setState({onEdit: false})
  }

  onDelete() {

  }

  render () {
    const { onEdit, editPlaylistModalShown } = this.state;
    const { title, uploader, editable, playlistId  } = this.props;
    const selectedVideos = this.props.playlist.map(thumb => {
      return thumb.videoid;
    })
    const initialTitleFormValues = {
      initialValues: {
        title: title
      }
    }
    const menuProps = [
      {
        label: 'Edit Title',
        onClick: this.onEditTitle.bind(this)
      },
      {
        label: 'Change Videos',
        onClick: this.onChangeVideos.bind(this)
      },
      {
        label: 'Reorder Videos',
        onClick: this.onReorderVideos.bind(this)
      },
      {
        separator: true
      },
      {
        label: 'Remove Playlist',
        onClick: this.onDelete.bind(this)
      }
    ]
    return (
      <div className="container-fluid">
        <div className="row container-fluid">
          {
            onEdit ?
            <div
              className="input-group col-sm-6 pull-left"
              style={{
                paddingBottom: '0.3em'
              }}
            >
              <EditTitleForm
                {...initialTitleFormValues}
                onEditSubmit={ this.onEditedTitleSubmit.bind(this) }
                onEditCancel={ this.onEditTitleCancel.bind(this) }
              />
            </div>
            :
            <h4
              className="pull-left"
            >
              {title} <small>by {uploader}</small>
            </h4>
          }
          {
            editable && <SmallDropdownButton
              menuProps={menuProps}
              rightMargin="1em"
            />
          }
        </div>
        <Carousel slidesToShow={5} slidesToScroll={5} cellSpacing={20}>
          { this.renderThumbs() }
        </Carousel>
        {editPlaylistModalShown &&
          <EditPlaylistModal
            show={true}
            selectedVideos={selectedVideos}
            playlistId={playlistId}
            onHide={ () => this.setState({editPlaylistModalShown: false})}
          />
        }
      </div>
    )
  }
}
