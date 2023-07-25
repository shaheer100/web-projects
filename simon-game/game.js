//defining main variables
var buttonColors = ["red", "blue", "green", "yellow"];
var gamePattern = [];
var userPattern = [];
var gameStatus = false;
var level = 0;
var scores = [];

//first keypress to get the game started and edit the title to display the current level
$(document).keypress(function() {
  if (!gameStatus) {
    $("#level-title").text("Level " + level);
    displayPattern();
    gameStatus = true;
  }
});

//when a user clicks the buttons, we animate and play sound and check if it matches sequence
$(".btn").click(function() {
  var userChosenColor = $(this).attr("id");
  userPattern.push(userChosenColor);

  playSound(userChosenColor);
  animatePress(userChosenColor);

  checkAnswer(userPattern.length - 1);
});

//function that checks the users clicks against the actual game pattern and deals with the game ending
function checkAnswer(currentLevel) {
  if (gamePattern[currentLevel] === userPattern[currentLevel]) {
    if (gamePattern.length === userPattern.length) {
      setTimeout(function() {
        displayPattern();
      }, 1000);
    }
  } else {
    playSound("wrong");

    $("body").addClass("game-over");
    $("#level-title").text("Game Over, Press Any Key to Restart");
    
    setTimeout(function() {
      $("body").removeClass("game-over");
    }, 200);

    gameOver();
  }
}

//this function displays the previous pattern up till this point and calls nextPattern (next level)
function displayPattern() {
  userPattern = [];
  level++;
  $("#level-title").text("Level " + level);

  var i = 0;
  var interval = setInterval(function() {
    var color = gamePattern[i];
    animatePress(color);
    playSound(color);
    i++;

    if (i >= gamePattern.length) {
      clearInterval(interval);
      setTimeout(function() {
        nextPattern();
      }, 1000);
    }
  }, 1000);
}

//adds a random color on to the pre exisitng pattern (the next level)
function nextPattern() {
  var randomNumber = Math.floor(Math.random() * 4);
  var randomChosenColor = buttonColors[randomNumber];
  gamePattern.push(randomChosenColor);

  $("#" + randomChosenColor).fadeIn(100).fadeOut(100).fadeIn(100);
  playSound(randomChosenColor);
}

//deals with the sounds of each button and sounds when the game ends
function playSound(name) {
  var audio = new Audio("sounds/" + name + ".mp3");
  audio.play();
}

//the animation associated with every button pressed
function animatePress(currentColor) {
  $("#" + currentColor).addClass("pressed");

  setTimeout(function() {
    $("#" + currentColor).removeClass("pressed");
  }, 100);
}

//when game ends the variables are reset
function gameOver() {
  scores.push(level);
  level = 0;
  gamePattern = [];
  gameStatus = false;
}

//"how to play" popups
function openInfoPopup() {
  $("#info-popup").css("display", "block");
  
  $("#how-to").addClass("pressed");
  setTimeout(function() {
    $("#how-to").removeClass("pressed");
  }, 100);
}

function closeInfoPopup() {
  $("#info-popup").css("display", "none");
}

//"scores" popups
function openScorePopup() {
  $("#score-popup").css("display", "block");
  showScores();

  $("#score").addClass("pressed");
  setTimeout(function() {
    $("#score").removeClass("pressed");
  }, 100);
}

function closeScorePopup() {
  $("#score-popup").css("display", "none");
}

function showScores() {
  var scoreList = scores.map(function(score, index) {
    return "Game " + (index + 1) + ": Level " + score;
  });

  $("#score-list").html(scoreList.join("<br>"));
}
