import React, {Component} from 'react';
import {connect} from 'react-redux';
import {
  editVideoPageAsync,
  deleteVideoAsync,
  uploadQuestionsAsync,
  uploadVideoCommentAsync,
  uploadVideoReplyAsync,
  likeVideoAsync,
  resetVideoPage
} from 'redux/actions/VideoActions';
import Carousel from 'components/Carousel';
import Button from 'components/Button';
import ChoiceListGroup from './ChoiceListGroup';
import PageTab from './PageTab';
import VideoLikeInterface from './VideoLikeInterface';
import Comments from './Comments';
import Description from './Description';
import ResultModal from './Modals/ResultModal';
import QuestionsBuilder from './QuestionsBuilder';
import UserListModal from 'components/Modals/UserListModal';
import ConfirmModal from 'components/Modals/ConfirmModal';
import {bindActionCreators} from 'redux';
import {stringIsEmpty} from 'helpers/stringHelpers';


@connect(
  state => ({
    ...state.VideoReducer.videoPage,
    userType: state.UserReducer.userType,
    isAdmin: state.UserReducer.isAdmin,
    userId: state.UserReducer.userId
  }),
  {
    editVideoPage: editVideoPageAsync,
    deleteVideo: deleteVideoAsync,
    uploadQuestions: uploadQuestionsAsync,
    uploadVideoComment: uploadVideoCommentAsync,
    likeVideo: likeVideoAsync,
    resetVideoPage
  }
)
export default class VideoPage extends Component {
  constructor() {
    super()
    this.state = {
      watchTabActive: true,
      currentSlide: 0,
      userAnswers: [],
      resultModalShown: false,
      editModalShown: false,
      confirmModalShown: false,
      questionsBuilderShown: false,
      userListModalShown: false
    }
    this.onDescriptionEditFinish = this.onDescriptionEditFinish.bind(this)
    this.onVideoLikeClick = this.onVideoLikeClick.bind(this)
    this.onSlide = this.onSlide.bind(this)
    this.onQuestionsFinish = this.onQuestionsFinish.bind(this)
    this.onQuestionsSubmit = this.onQuestionsSubmit.bind(this)
    this.numberCorrect = this.numberCorrect.bind(this)
    this.onCommentSubmit = this.onCommentSubmit.bind(this)
    this.onVideoDelete = this.onVideoDelete.bind(this)
    this.onSelectChoice = this.onSelectChoice.bind(this)
  }

  componentWillUnmount() {
    this.props.resetVideoPage()
  }

  render() {
    let {
      uploaderId,
      uploaderName,
      description,
      userId,
      videoId,
      videoCode,
      title,
      questions = [],
      likes = [],
      comments,
      noComments } = this.props;
    const {
      watchTabActive,
      questionsBuilderShown,
      resultModalShown,
      confirmModalShown,
      userListModalShown,
      currentSlide } = this.state;
    if (videoId === 0) {
      return (
        <div>Video Not Found</div>
      )
    }
    const youtubeIframeContainerClassName = watchTabActive ?
    'embed-responsive embed-responsive-16by9' :
    'video-container-fixed-left';
    const youtubeIframeClassName = watchTabActive ?
    'embed-responsive-item' :
    'video-fixed-left';
    const tabPaneClassName = watchTabActive ?
    'container col-sm-8 col-sm-offset-2' :
    'container';

    return (
      <div
        className="container-fluid"
        style={{
          backgroundColor: '#fff',
          marginBottom: '2em'
        }}
      >
        <Description
          videoId={videoId}
          title={title}
          uploaderName={uploaderName}
          description={description}
          uploaderId={uploaderId}
          userId={userId}
          onEditFinish={this.onDescriptionEditFinish}
          onDelete={() => this.setState({confirmModalShown: true})}
        />
        <div className="row container-fluid" style={{paddingTop: '1.5em'}}>
          <PageTab
            questions={questions}
            watchTabActive={watchTabActive}
            onWatchTabClick={() => this.setState({watchTabActive: true})}
            onQuestionTabClick={() => this.setState({watchTabActive: false})}
          />
          <div
            className={`tab-pane ${tabPaneClassName}`}
            style={{
              paddingTop: '3em'
            }}
          >
            {!questionsBuilderShown &&
              <div>
                <div className={`${youtubeIframeContainerClassName}`}>
                  <iframe
                    key={videoId}
                    className={`${youtubeIframeClassName}`}
                    frameBorder="0"
                    allowFullScreen="1"
                    title={title}
                    width="640"
                    height="360"
                    src={`https://www.youtube.com/embed/${videoCode}`}>
                  </iframe>
                </div>
                {watchTabActive &&
                  <VideoLikeInterface
                    userId={userId}
                    likes={likes}
                    onLikeClick={this.onVideoLikeClick}
                    showLikerList={() => this.setState({userListModalShown: true})}
                  />
                }
              </div>
            }
            {!watchTabActive && questions.length > 0 &&
              <Carousel
                progressBar
                showQuestionsBuilder={() => this.setState({questionsBuilderShown: true})}
                userIsUploader={userId === uploaderId}
                slidesToShow={1}
                slidesToScroll={1}
                slideIndex={currentSlide}
                dragging={false}
                afterSlide={this.onSlide}
                onFinish={this.onQuestionsFinish}
              >
                {this.renderSlides()}
              </Carousel>
            }
            {!watchTabActive && questions.length === 0 &&
              <div className="text-center">
                <p>There are no questions yet.</p>
                {userId === uploaderId &&
                  <Button
                    className="btn btn-default"
                    style={{marginTop: '1em'}}
                    onClick={() => this.setState({questionsBuilderShown: true})}
                  >Add Questions</Button>
                }
              </div>
            }
          </div>
        </div>
        <Comments
          {...this.props}
          onSubmit={this.onCommentSubmit}
        />
        {resultModalShown &&
          <ResultModal
            onHide={() => this.setState({resultModalShown: false})}
            numberCorrect={this.numberCorrect}
            totalQuestions={questions.length}
          />
        }
        {confirmModalShown &&
          <ConfirmModal
            title="Remove Video"
            onHide={() => this.setState({confirmModalShown: false})}
            onConfirm={this.onVideoDelete}
          />
        }
        {questionsBuilderShown &&
          <QuestionsBuilder
            questions={questions}
            title={title}
            videoCode={videoCode}
            onSubmit={this.onQuestionsSubmit}
            onHide={() => this.setState({questionsBuilderShown: false})}
          />
        }
        {userListModalShown &&
          <UserListModal
            onHide={() => this.setState({userListModalShown: false})}
            title="People who liked this video"
            userId={userId}
            users={likes.map(like => {
              return {
                username: like.username,
                userId: like.userId
              }
            })}
            description={user => user.userId === userId && '(You)'}
          />
        }
      </div>
    )
  }

  renderSlides() {
    const {questions} = this.props;
    const {currentSlide, userAnswers} = this.state;
    return questions.map((question, index) => {
      const filteredChoices = question.choices.filter(choice => {
        return choice !== null;
      })
      let isCurrentSlide = index === currentSlide;
      const listItems = filteredChoices.map((choice, index) => {
        let isSelectedChoice = index === userAnswers[currentSlide];
        return {
          label: choice,
          checked: isCurrentSlide && isSelectedChoice
        }
      })
      return (
        <div key={index}>
          <div>
            <h3 style={{marginTop: '1rem'}} dangerouslySetInnerHTML={{__html: question.title}} />
          </div>
          <ChoiceListGroup
            listItems={listItems}
            onSelect={this.onSelectChoice}
          />
        </div>
      )
    })
  }

  numberCorrect() {
    const {userAnswers} = this.state;
    const correctAnswers = this.props.questions.map(question => {
      return question.correctChoice;
    })
    let numberCorrect = 0;
    for (let i = 0; i < userAnswers.length; i++) {
      if (userAnswers[i] + 1 === correctAnswers[i]) numberCorrect++;
    }
    return numberCorrect;
  }

  onSlide(index) {
    this.setState({currentSlide: index})
  }

  onQuestionsFinish() {
    this.setState({resultModalShown: true})
  }

  onSelectChoice(index) {
    let {userAnswers, currentSlide} = this.state;
    userAnswers[currentSlide] = index;
    this.setState({userAnswers})
  }

  onDescriptionEditFinish(params, sender) {
    this.props.editVideoPage(params, sender);
  }

  onVideoDelete() {
    const {videoId} = this.props;
    this.props.deleteVideo({videoId});
  }

  onQuestionsSubmit(questions) {
    const data = {
      videoId: this.props.videoId,
      questions: questions.map(question => {
        const choices = question.choices.filter(choice => {
          return choice.label && !stringIsEmpty(choice.label);
        })
        return {
          videoId: this.props.videoId,
          title: question.title,
          correctChoice: (() => {
            let correctChoice = 0;
            for (let i = 0; i < choices.length; i ++) {
              if (choices[i].checked) correctChoice = i+1;
            }
            return correctChoice;
          })(),
          choice1: choices[0].label,
          choice2: choices[1].label,
          choice3: choices[2] ? choices[2].label : null,
          choice4: choices[3] ? choices[3].label : null,
          choice5: choices[4] ? choices[4].label : null,
          creator: this.props.userId
        }
      })
    }
    this.props.uploadQuestions(data, () => {
      this.setState({
        questionsBuilderShown: false,
        currentSlide: 0,
        userAnswers: []
      })
    });
  }

  onCommentSubmit(comment) {
    const {videoId} = this.props;
    this.props.uploadVideoComment(comment, videoId);
  }

  onVideoLikeClick() {
    const {videoId} = this.props;
    this.props.likeVideo(videoId);
  }
}
