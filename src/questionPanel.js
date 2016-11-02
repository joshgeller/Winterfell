var React    = require('react');
var _        = require('lodash').noConflict();
var KeyCodez = require('keycodez');

var Validation    = require('./lib/validation');
var ErrorMessages = require('./lib/errors');

var Button      = require('./button');
var QuestionSet = require('./questionSet');

class QuestionPanel extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      validationErrors : this.props.validationErrors
    };
  }

  componentWillMount() {
    /*
     * If the user is editing the builder, validate the first panel on mount.
     */
    if (this.props.live) {
      this.validatePanel(true);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    /*
     * If the panel switches in edit mode, trigger validation.
     */
    if (this.props.live && prevProps.panelId !== this.props.panelId) {
      this.validatePanel(true);
    }
  }

  handleAnswerValidate(questionId, questionAnswer, validations) {
    if (typeof validations === 'undefined'
         || validations.length === 0) {
      return;
    }

    /*
     * Run the question through its validations and
     * show any error messages if invalid.
     */
    var questionValidationErrors = [];
    validations
      .forEach(validation => {
        if (Validation.validateAnswer(questionAnswer,
                                      validation,
                                      this.props.questionAnswers)) {
          return;
        }

        // Pass the user's answer value to custom validation rules.
        validation.questionAnswer = questionAnswer;

        questionValidationErrors.push({
          type    : validation.type,
          message : ErrorMessages.getErrorMessage(validation)
        });
      });

    var validationErrors = _.chain(this.state.validationErrors)
                            .set(questionId, questionValidationErrors)
                            .value();

    this.setState({
      validationErrors : validationErrors
    });

    // Validate the panel, but don't show error messages for all questions.
    this.validatePanel(false)
  }

  validatePanel(showErrorMessages) {
    var action     = this.props.action.default;
    var conditions = this.props.action.conditions || [];
    if (showErrorMessages === undefined) {
      showErrorMessages = true;
    }

    /*
     * We need to get all the question sets for this panel.
     * Collate a list of the question set IDs required
     * and run through the schema to grab the question sets.
     */
    var questionSetIds = this.props.questionSets.map(qS => qS.questionSetId);
    var questionSets   = _.chain(this.props.schema.questionSets)
                          .filter(qS => questionSetIds.indexOf(qS.questionSetId) > -1)
                          .value();

    /*
     * Get any incorrect fields that need error messages.
     */
    var invalidQuestions = Validation.getQuestionPanelInvalidQuestions(
      questionSets, this.props.questionAnswers
    );

    /*
     * If the panel isn't valid...
     */
    if (showErrorMessages) {
      if (Object.keys(invalidQuestions).length > 0) {
        var validationErrors = _.mapValues(invalidQuestions, validations => {
          return validations.map(validation => {
            return {
              type    : validation.type,
              message : ErrorMessages.getErrorMessage(validation)
            };
          })
        });

        this.setState({
          validationErrors : validationErrors
        }, function() {
          if (Object.keys(invalidQuestions).length > 0) {
            // Scroll to first error
            const e = document.getElementsByClassName('builder-field-error-message')
            if (e.length && e[0].scrollIntoView) {
              e[0].scrollIntoView()
            }
          }
        });
      }
    }

    this.props.onValidatePanel(
      Object.keys(invalidQuestions).length === 0
    )

    return Object.keys(invalidQuestions).length === 0
  }

  handleMainButtonClick() {
    var action     = this.props.action.default;
    var conditions = this.props.action.conditions || [];

    if (!this.validatePanel) return

    /*
     * Panel is valid. So what do we do next?
     * Check our conditions and act upon them, or the default.
     */
    conditions
      .forEach(condition => {
        var answer = this.props.questionAnswers[condition.questionId];

        action = answer == condition.value
                   ? {
                       action : condition.action,
                       target : condition.target
                     }
                   : action;
      });

    /*
     * Decide which action to take depending on
     * the action decided upon.
     */
    switch (action.action) {

      case 'GOTO':
        this.props.onSwitchPanel(action.target);
        break;

      case 'SUBMIT':
        this.props.onSubmit(action.target);
        break;
    }
  }

  handleBackButtonClick() {
    if (this.props.panelHistory.length == 0) {
      return;
    }

    this.props.onPanelBack();
  }

  handleAnswerChange(questionId, questionAnswer, validations, validateOn) {
    this.props.onAnswerChange(questionId, questionAnswer);

    this.setState({
      validationErrors : _.chain(this.state.validationErrors)
                          .set(questionId, [])
                          .value()
    });

    if (validateOn === 'change') {
      this.handleAnswerValidate(questionId, questionAnswer, validations);
    }
  }

  handleQuestionBlur(questionId, questionAnswer, validations, validateOn) {
    if (validateOn === 'blur') {
      this.handleAnswerValidate(questionId, questionAnswer, validations);
    }
  }

  handleInputKeyDown(e) {
    if (KeyCodez[e.keyCode] === 'enter') {
      e.preventDefault();
      this.handleMainButtonClick.call(this);
    }
  }

  render() {
    var questionSets = this.props.questionSets.map(questionSetMeta => {
      var questionSet = _.find(this.props.schema.questionSets, {
        questionSetId : questionSetMeta.questionSetId
      });

      if (!questionSet) {
        return undefined;
      }

      return (
        <QuestionSet key={questionSet.questionSetId}
          id={questionSet.questionSetId}
          name={questionSet.name}
          questionSetHeader={questionSet.questionSetHeader}
          questionSetText={questionSet.questionSetText}
          questions={questionSet.questions}
          classes={this.props.classes}
          questionAnswers={this.props.questionAnswers}
          renderError={this.props.renderError}
          renderRequiredAsterisk={this.props.renderRequiredAsterisk}
          validationErrors={this.state.validationErrors}
          onAnswerChange={this.handleAnswerChange.bind(this)}
          onQuestionBlur={this.handleQuestionBlur.bind(this)}
          onKeyDown={this.handleInputKeyDown.bind(this)} />
      );
    });

    return (
      <div className={this.props.classes.questionPanel}>
        {typeof this.props.panelHeader !== 'undefined'
          || typeof this.props.panelText !== 'undefined'
          ? (
            <div className={this.props.classes.questionPanelHeaderContainer}>
              {typeof this.props.panelHeader !== 'undefined'
                ? (
                  <h3 className={this.props.classes.questionPanelHeaderText}>
                    {this.props.panelHeader}
                  </h3>
                )
              : undefined}
              {typeof this.props.panelText !== 'undefined'
                ? (
                  <p className={this.props.classes.questionPanelText}>
                    {this.props.panelText}
                  </p>
                )
              : undefined}
              {!this.props.isValid && this.props.live
                ? (
                  <div className={this.props.classes.invalidPanelMessage}>
                    <p>
                      <i className='fa fa-exclamation-circle'></i>{' '}
                      Whoops! Please correct the errors in red below.
                    </p>
                  </div>
                )
              : undefined}
            </div>
          )
        : undefined}
        <div className={this.props.classes.questionSets}>
          {questionSets}
        </div>
        <div className={this.props.classes.buttonBar}>
          {this.props.panelHistory.length > 1
            && !this.props.backButton.disabled
            ? (
              <Button text={this.props.backButton.text || 'Back'}
                onClick={this.handleBackButtonClick.bind(this)}
                className={this.props.classes.backButton} />
            )
          : undefined}
          {!this.props.button.disabled
            ? (
              <Button text={this.props.button.text}
                onClick={this.handleMainButtonClick.bind(this)}
                className={this.props.classes.controlButton} />
            )
          : undefined}
          {this.props.publishButton
            ? this.props.publishButton(this.props.classes.publishButton)
          : undefined}
        </div>
      </div>
    );
  }

};

QuestionPanel.defaultProps = {
  validationErrors       : {},
  schema                 : {},
  classes                : {},
  live                   : false,
  isValid                : true,
  panelId                : undefined,
  panelIndex             : undefined,
  panelHeader            : undefined,
  panelText              : undefined,
  publishButton          : undefined,
  action                 : {
    default    : {},
    conditions : []
  },
  button                 : {
    text : 'Submit'
  },
  backButton             : {
    text : 'Back'
  },
  questionSets           : [],
  questionAnswers        : {},
  renderError            : undefined,
  renderRequiredAsterisk : undefined,
  onAnswerChange         : () => {},
  onSwitchPanel          : () => {},
  onPanelBack            : () => {},
  onPanelBack            : () => {},
  onValidatePanel        : () => {},
  panelHistory           : [],
};

module.exports = QuestionPanel;
