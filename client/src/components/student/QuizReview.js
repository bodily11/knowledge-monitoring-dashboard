import React, { Component } from 'react';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';

import { withAuthCheck } from '../shared/AuthCheck';

import { formatScore } from '../../utils';
import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

import Logo from '../../logo_boxed.svg';

import QuestionReview from './QuestionReview';
import Modal from '../shared/Modal';

import WadayanoScore from '../shared/WadayanoScore';

class QuizReview extends Component {

    constructor(props) {
        super(props);
    
        this.state = {
            concept:null,
            concepts: [],
            showReviewForConcept: null,
            conceptQuestions: [],
            savedScrollPosition: null,
            confidenceText:null,
            confidenceEmoji:null,
            wadayano:null,
            displayConceptReview:false,
            helpTextShow:false,
            displayhelpText:false,
        };
    
        // Pre-bind this function, to make adding it to input fields easier
        //this.saveQuiz = this.saveQuiz.bind(this);
        this.selectReview = this.selectReview.bind(this);
    }


    wadayanoScore(quizAttempt)
    {
        var i = 0;
        //var wadayano = 0;
        var questionNum = 0;
        var correctConfidence = 0;
        
        //console.log("confidence:"+quizAttempt.conceptConfidence);
        //console.log("correct:"+quizAttempt.correct);

        for(i; i < quizAttempt.questionAttempts.length; i++){
            questionNum += 1;
            if((quizAttempt.questionAttempts[i].isConfident && quizAttempt.questionAttempts[i].isCorrect) || 
              (!quizAttempt.questionAttempts[i].isConfident && !quizAttempt.questionAttempts[i].isCorrect) ){
                correctConfidence += 1;
            }
        }
        if(this.state.wadayano === null){
            var wadayano = parseFloat((correctConfidence / questionNum * 100)).toFixed(1);
            this.setState({wadayano});
            this.confidenceText(wadayano,quizAttempt);
        }
    }

    overallScore(quizAttempt){
        var correct = 0;
        for(var i=0;i<quizAttempt.questionAttempts.length; i++){
            if(quizAttempt.questionAttempts[i].isCorrect){
                correct+=1;
            }
        }
        var numQuestion = quizAttempt.questionAttempts.length;
        var percent = correct/numQuestion*10;
        //console.log("percent:"+percent+"%");
    }

    confidenceText(wadayano, quizAttempt){
        var quizConfidenceText;
        var quizConfidenceEmoji;
        var quizOverC = 0;
        var quizUnderC = 0;
        for(var i = 0; i < quizAttempt.questionAttempts.length; i++){
            var correct = 0;
            var confident = 0;
            var compare = 0;
            if(quizAttempt.questionAttempts[i].isConfident){
                confident = 1;
            }
            if(quizAttempt.questionAttempts[i].isCorrect){
                correct = 1;
            }
            compare = confident - correct;
            switch(compare){
                case -1:
                    quizUnderC += 1;
                    break;
                case 0:
                    break;
                case 1:
                quizOverC += 1;
                    break;
            } 
        }
        if(wadayano > 90){
            quizConfidenceText = "Accurate";
            quizConfidenceEmoji = "🧘";
        } else if(quizOverC === quizUnderC){
            quizConfidenceText = "Mixed";
            quizConfidenceEmoji = "🤷‍";
        } else if(quizOverC > quizUnderC){
            quizConfidenceText = "Overconfident";
            quizConfidenceEmoji = "🤦‍";
        } else {
            quizConfidenceText = "Underconfident";
            quizConfidenceEmoji = "🙍‍";
        }
        this.setState({confidenceText:quizConfidenceText});
        this.setState({confidenceEmoji:quizConfidenceEmoji});
    }
    //go through each concept and calculate the confidence bias/error
    sortConcepts(quizAttempt){
        // Get concepts from all questions in the quiz
        var quizConcepts = quizAttempt.quiz.questions.map(q => q.concept);
        // Remove duplicate concepts
        quizConcepts = Array.from(new Set(quizConcepts));

        var conceptConfidences = [];
        for(var i=0;i<quizConcepts.length;i++){
            
            //var confidence = 0;
            conceptConfidences.push({
                concept:"",
                confidence:0,
                confidenceError:0.0,
                confidenceBias:0.0,
                questionCnt:0,
                confidenceText:"",
                confidenceEmoji:"",
                conceptScore:0,
                correctQuestions:0,
                overCQuestions:0,
                underCQuestions:0,
                wadayano:0

            });
            conceptConfidences[i].concept = quizConcepts[i];
            conceptConfidences[i].confidence = quizAttempt.conceptConfidences[i].confidence;
            var confNum = 0;
            var corNum = 0;
            var correct = 0;
            for(var j=0; j<quizAttempt.questionAttempts.length; j++){
                conceptConfidences[i].id = i;
                var question = quizAttempt.questionAttempts[j].question;
                var questionAttempt = quizAttempt.questionAttempts[j];
                
                if(question.concept === quizConcepts[i]){
                    conceptConfidences[i].questionCnt +=1;
                    if(quizAttempt.questionAttempts[j].confidence){
                        conceptConfidences[i].confidence += 1;
                    }
    
                    if(questionAttempt.isCorrect){
                        correct+=1;
                    }
                    
                    if(questionAttempt.isConfident){
                        confNum = 1;
                    } else {
                        confNum = 0;
                    }
                    if(questionAttempt.isCorrect){
                        corNum = 1;
                    } else {
                        corNum = 0;
                    }
                    var compare = confNum - corNum; //get over/under/accurate confidence for single concept
                    console.log(compare);
                    switch(compare){
                        case -1:
                            console.log("A?");
                            conceptConfidences[i].underCQuestions += 1;
                            break;
                        case 0:
                            console.log("B?");
                            conceptConfidences[i].correctQuestions += 1;
                            break;
                        case 1:
                            console.log("C?");
                            conceptConfidences[i].overCQuestions += 1;
                            break;
                    }  
                }
            }
            //
            conceptConfidences[i].conceptScore = parseFloat((correct/conceptConfidences[i].questionCnt)*100).toFixed(1); //individual concept score
            conceptConfidences[i].confidenceError = Math.abs(conceptConfidences[i].confidence - correct);
            conceptConfidences[i].confidenceBias = (conceptConfidences[i].confidence - correct);
            conceptConfidences[i].wadayano = ((conceptConfidences[i].correctQuestions/conceptConfidences[i].questionCnt)*100).toFixed(1);
            console.log(conceptConfidences[i].correctQuestions);
            console.log(conceptConfidences[i].questionCnt);
            console.log(conceptConfidences[i].wadayano);
            if(conceptConfidences[i].wadayano > 90){
                conceptConfidences[i].confidenceText = "Accurate";
                conceptConfidences[i].confidenceEmoji = "🧘";
            } else if(conceptConfidences[i].overCQuestions === conceptConfidences[i].underCQuestions){
                conceptConfidences[i].confidenceText = "Mixed";
                conceptConfidences[i].confidenceEmoji = "🤷‍";
            } else if(conceptConfidences[i].overCQuestions > conceptConfidences[i].underCQuestions){
                conceptConfidences[i].confidenceText = "Overconfident";
                conceptConfidences[i].confidenceEmoji = "🤦‍";
            } else {
                conceptConfidences[i].confidenceText = "Underconfident";
                conceptConfidences[i].confidenceEmoji = "🙍‍";
            }
            console.log(conceptConfidences[i].confidenceText);
        }
        return conceptConfidences;
    }

    selectReview(concept, quizAttempt){
        var conceptQuestions = [];
        var questionAttempt;
        for(var i = 0; i < quizAttempt.questionAttempts.length; i++){
            questionAttempt = quizAttempt.questionAttempts[i];
            if(questionAttempt.question.concept === concept){
                conceptQuestions.push(questionAttempt);
            }
        }
        this.setState({conceptQuestions: conceptQuestions, showReviewForConcept: concept, concept, displayConceptReview:true});
    }

    helpText(){
        this.setState({displayhelpText: true});
    }
    

  render() {

    console.log("here");
    console.log(this.props);
    
    if (this.props.quizAttemptQuery && this.props.quizAttemptQuery.loading) {
        return <LoadingBox />;
    }

    if (this.props.quizAttemptQuery && this.props.quizAttemptQuery.error) {
        return <ErrorBox>Couldn’t load quiz</ErrorBox>;
    }
    //console.log(this.props.quizAttemptQuery);

    const quizAttempt = this.props.quizAttemptQuery.currentStudentQuizAttempt;
    
    //console.log(quizAttempt.questionAttempts[0].question.title);

    this.wadayanoScore(quizAttempt);

    //this.sortConcepts(quizAttempt);
    //this.overallScore(quizAttempt);
    
    // Use conceptConfidences from the quizAttempt prop
    //const conceptConfidences = quizAttempt.conceptConfidences;
    const conceptConfidences = this.sortConcepts(quizAttempt);

    // Score format of 33.3%
    const formattedScore = formatScore(quizAttempt.score);

    // If postSucceeded is null, then it was not a graded attempt
    const isGraded = (quizAttempt.postSucceeded !== null);
    const gradePostMessage = isGraded && (quizAttempt.postSucceeded ?
            <span className="notification is-success is-inline-block">Score was posted successfully.</span>
        :
            <span className="notification is-warning is-inline-block">There was an error posting your score to your learning management system. Your instructor will be notified of your score and will enter it manually.</span>
        );

    return (
        <div>
            <div className="columns">
                <div className="column">
                <h2 className="subtitle is-2">{quizAttempt.quiz.title}</h2>
                    <h2 className="subtitle is-2">Score: {formattedScore}</h2>
                    <WadayanoScore wadayano={this.state.wadayano} confidenceText={this.state.confidenceText}/>
                </div>
            </div>
            <div className="tile is-ancestor" style={{flexWrap: "wrap"}}>
            {conceptConfidences.map((conceptConfidence, index) => 
                <div className="tile is-6 is-parent" key={conceptConfidence.id}>
                    <div className="tile is-child box">
                        <p className="title">
                            <div>{conceptConfidence.concept}</div>
                            <div id="questionNum" >{conceptConfidence.questionCnt === 1 ? '1 Question' : conceptConfidence.questionCnt + ' Questions'}</div>
                        </p>
                        <p className="title">
                            Score: {conceptConfidence.conceptScore}%
                        </p>
                        <WadayanoScore wadayano={conceptConfidence.wadayano} confidenceText={conceptConfidence.confidenceText}/>
                        <div id={conceptConfidence.concept+ "review"}></div>
                        <footer className="">
                            <button className="button is-primary is-block" style={{width: "100%"}} onClick = {this.selectReview.bind(null,conceptConfidence.concept, quizAttempt)}>View Details</button>
                        </footer>
                    </div>
                </div>
            )}
            </div>
            <Modal
                modalState={this.state.displayConceptReview}
                closeModal={() => this.setState({ displayConceptReview: false })}
                title={"Concept Review: " + this.state.concept}>
                <span className="concept-questions-list" id={"questionReview"+this.state.concept}>
                    {this.state.conceptQuestions.map(conceptQuestion => (
                        <div className = "question-review">
                        <QuestionReview id={conceptQuestion.id} questionAttempt={conceptQuestion} question={conceptQuestion.question} />
                        </div>
                    ))}
                    <br/>
                </span>
            </Modal>
            <Modal
                modalState={this.state.displayhelpText}
                closeModal={() => this.setState({ displayhelpText: false })}
                title={"Help:"}>
                <div>Wadayano Score measures how well you know what you know.

-Higher scores mean you are only confident about things you actually know.

-Lower scores may indicate that you are over- or under-confident.</div>
            </Modal>
        </div>)
  }
}

QuizReview.propTypes = {
    quizAttempt: PropTypes.object.isRequired
};

const QUIZ_ATTEMPT_QUERY = gql`
  query quizAttemptQuery($id: ID!) {
    currentStudentQuizAttempt(id: $id) {
      id
      completed
      score
      postSucceeded
      quiz {
        id
        title
        questions {
          id
          prompt
          concept
          options {
            id
            text
          }
        }
      }
      questionAttempts {
        id
        question {
          id
          prompt
          concept
          options{
              id
              text
          }
        }
        option {
          id
          text
        }
        correctOption {
          id
          text
        }
        isCorrect
        isConfident
      }
      conceptConfidences {
        id
        concept
        confidence
      }
    }
  }
`

export default withAuthCheck(compose(
    graphql(QUIZ_ATTEMPT_QUERY, {
      name: 'quizAttemptQuery',
      options: (props) => {
        console.log(props);
        return { variables: { id: props.quizAttempt.id } }
      }
    }),
  )(QuizReview), { student: true, instructor: true });