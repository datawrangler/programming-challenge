/// <reference path="../typings/index.d.ts" />

import PIXI = require('pixi.js');
const renderer:PIXI.WebGLRenderer = new PIXI.WebGLRenderer(1280, 720);
document.body.appendChild(renderer.view);

// You need to create a root container that will hold the scene you want to draw.
const stage:PIXI.Container = new PIXI.Container();

/*
// Declare a global variable for our sprite so that the animate function can access it.
let bunny:PIXI.Sprite = null;

// load the texture we need
PIXI.loader.add('bunny', 'images/bunny.jpeg').load(function (loader:PIXI.loaders.Loader, resources:any) {
    // This creates a texture from a 'bunny.png' image.
    bunny = new PIXI.Sprite(resources.bunny.texture);

    // Setup the position and scale of the bunny
    bunny.position.x = 400;
    bunny.position.y = 300;

    bunny.scale.x = 2;
    bunny.scale.y = 2;

    // Add the bunny to the scene we are building.
    stage.addChild(bunny);

    // kick off the animation loop (defined below)
    animate();
});
*/
function animate() {
    // start the timer for the next animation loop
    requestAnimationFrame(animate);
    // this is the main render call that makes pixi draw your container and its children.
    renderer.render(stage);
}


//////////////////////////////////////////////////

enum Direction {
  Up = 1,
  Down,
  Left,
  Right
}

////////////// Checkerboard //////////////////////

class Checkerboard {

  roundOver:boolean = false;

  private grid:CheckerboardCell[][];
  private cursorPosition:PIXI.Point = new PIXI.Point(-1, -1);

  constructor(numRows:number, numColumns:number) {
    if (numRows >= minBoardSize) {
      if (numColumns >= minBoardSize) {
        if (numColumns <= maxBoardSize) {
          if (numRows <= maxBoardSize) {
            this.createBoard(numRows, numColumns);
          }
        }
      }
    } else {
      throw new Error("Lousy board size")
    }
  }

  get numRows():number {
    return this.grid.length;
  }

  get numColumns():number {
    return this.grid[0].length;
  }

  get isEmpty():boolean {
    return this.cursorPosition.y < 0;
  }

  reset():void {
    this.roundOver = false;
    this.cursorPosition.x = this.cursorPosition.y = -1;
    for (let row = 0; row<this.numRows; row++) {
      for (let col = 0; col<this.numColumns; col++) {
        this.grid[row][col].reset();
      }
    }
  }

  createBoard(numRows, numColumns):void {
    this.grid = [[]];
    this.cursorPosition.x = this.cursorPosition.y = -1;
    for (let row = 0; row<numRows; row++) {
      this.grid[row] = [];
      for (let col = 0; col<numColumns; col++) {
        this.grid[row][col] = new CheckerboardCell();
      }
    }
    this.shuffleArrows();
  }

  seedPath():void {
    let seed:PIXI.Point = new PIXI.Point(randomInt(0,board.numRows-1), randomInt(0, board.numColumns-1));
    this.occupyCell(seed.x, seed.y);

    let hasLoop:boolean = this.probe(seed.x, seed.y);
    console.log("from " + seed.x + "," + seed.y + " we can " + (hasLoop ? "not " : "")+ "escape");
  }

  shuffleArrows():void {
    for (let row = 0; row<this.numRows; row++) {
      for (let col = 0; col<this.numColumns; col++) {
        let cell = this.grid[row][col];
        let dir:Direction = randomDirection();
        cell.pointerDirection = dir;
        let nextPosition:PIXI.Point = this.findNext(row, col, dir);
        if (null != nextPosition) {
          cell.next = this.getCell(nextPosition.y, nextPosition.x);
        }
      }
    }
  }

  advanceCursor():boolean {
    if (this.isEmpty) {
      return; // no cursor, no go
    }

    let currentCell:CheckerboardCell = this.getCell(this.cursorPosition.y, this.cursorPosition.x);
    let nextPosition:PIXI.Point = this.findNext(this.cursorPosition.y, this.cursorPosition.x, currentCell.pointerDirection);
    if (null != nextPosition) {
      let nextCell:CheckerboardCell = this.getCell(nextPosition.y, nextPosition.x);
      if (!nextCell.visited) {
        this.occupyCell(nextPosition.y, nextPosition.x);
        currentCell.occupied = false;
      } else {
        this.roundOver = true;
        sounds["tbone"].play();
      }
    } else {
      this.roundOver = true;
      sounds["tada"].play();
    }
    return this.roundOver;
  }

  occupyCell(row:number, col:number):void {
    sounds["wetfoot"].play();

    let theCell:CheckerboardCell = this.getCell(row, col);
    theCell.occupied = theCell.visited = true;

    this.cursorPosition.x = col;
    this.cursorPosition.y = row;
  }

  getCell(row:number, col:number):CheckerboardCell {
    return this.grid[row][col];
  }

  probe(row:number, col:number):boolean {
    return willLoop(this.grid[row][col]);
  }

  private findNext(row:number, col:number, dir:Direction):PIXI.Point {
    let nextPosition:PIXI.Point;
    switch(dir) {
      case Direction.Up:
        if (row > 0) {
          nextPosition = new PIXI.Point(col, row-1)
        }
        break;
      case Direction.Right:
        if (col < this.numColumns-1) {
          nextPosition = new PIXI.Point(col+1, row);
        }
        break;
      case Direction.Down:
        if (row < this.numRows-1) {
          nextPosition = new PIXI.Point(col, row+1);
        }
        break;
      case Direction.Left:
        if (col > 0) {
          nextPosition = new PIXI.Point(col-1, row);
        }
        break;
    }
    return nextPosition;
  }

}

//////////////////////////////////////////////////

interface LinkedList {
  next:LinkedList;
}

/////////////// Cell /////////////////////////////

class CheckerboardCell implements LinkedList {
  next:LinkedList = null;
  pointerDirection: Direction;
  occupied:boolean = false;
  visited:boolean = false;

  reset():void {
    this.occupied = this.visited = false;
  }

  toString():string {
    return "[Cell o:" + this.occupied + " v:" + this.visited + "]";
  }
}

////////////////// utils /////////////////////////

function randomDirection():Direction {
  return randomInt(1,4) as Direction;
}

function randomInt(min:number, max:number):number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

//////////////// Floyd's algorithm ///////////////

function willLoop(firstCell:LinkedList):boolean {
  let result:boolean = false; // Optimism
  // empty lists do not loop
  if (null == firstCell) {
    return result;
  }

  let tortoise:LinkedList;
  let hare:LinkedList;

  tortoise = hare = firstCell;

  while (true) {
    tortoise = tortoise.next;
    // hare will move twice as fast as tortoise
    if (null == hare.next) {
      // we escaped, no loop found
      break;
    } else {
      hare = hare.next.next;
    }

    // did either hit the edge?
    if ((null == tortoise) || (null == hare)) {
      // we escaped
      break;
    }

    if (tortoise == hare) {
      // we looped!
      result = true;
      break;
    }
  }

  return result;
}

/////////////////// GUI //////////////////////////

function loadSprites():void {
  PIXI.loader
    .add("playBtn", "images/playSmBtn.png")
    .add("stopBtn", "images/stopSmBtn.png")
    .add("resetBtn", "images/resetSmBtn.png")
    .add("shuffleBtn", "images/shuffleSmBtn.png")
    .add("embiggenBtn", "images/embiggenSmBtn.png")
    .add("unbiggenBtn", "images/unbiggenSmBtn.png")
    .load(
      (loader, resources) => {
        for (let prop in resources) {
          if (resources[prop].error) {
            console.log("Had a loading error: " + resources[prop].error);
            continue;
          }
          sprites[prop] = new PIXI.Sprite(resources[prop].texture);
        }
        layoutUI();
      }
    )
}

function makeButton(name:string, x:number, y:number):PIXI.Sprite {
  let sprite:PIXI.Sprite = sprites[name];
  sprite.name = name;
  sprite.position.x = x;
  sprite.position.y = y;
  sprite.pivot = new PIXI.Point(sprite.width/2, sprite.height/2);
  sprite.interactive = true;
  sprite.buttonMode = true;
  sprite.on("pointerdown", handleButtonPress);
  sprite.on("pointerup", handleButtonRelease);
  sprite.on("pointerupoutside", handleButtonRelease);
  return sprite;
}

function layoutUI():void {
  const MarginLeft:number = 256;
  const MarginTop:number = 125;
  const ButtonOffset:number = 90;

  statusField.x = 48;
  statusField.y = 640;
  stage.addChild(statusField);

  buttons["play"] = stage.addChild(makeButton("playBtn", MarginLeft, MarginTop)) as PIXI.Sprite;
  buttons["stop"] = stage.addChild(makeButton("stopBtn", MarginLeft, MarginTop + 1 * ButtonOffset)) as PIXI.Sprite;
  buttons["reset"] = stage.addChild(makeButton("resetBtn", MarginLeft, MarginTop + 2 * ButtonOffset)) as PIXI.Sprite;
  buttons["shuffle"] = stage.addChild(makeButton("shuffleBtn", MarginLeft, MarginTop + 3 * ButtonOffset)) as PIXI.Sprite;
  buttons["embiggen"] = stage.addChild(makeButton("embiggenBtn", MarginLeft, MarginTop + 4 * ButtonOffset)) as PIXI.Sprite;
  buttons["unbiggen"] = stage.addChild(makeButton("unbiggenBtn", MarginLeft, MarginTop + 5 * ButtonOffset)) as PIXI.Sprite;

  updateCells();
  updateUI();

  renderer.render(stage);
}

function updateUI():void {
  const Opaque:number = 1.0;
  const Dimmed:number = 0.5;

  let isRunning:boolean = GameState.Running == gameState;
  let isStopped:boolean = GameState.Stopped == gameState;

  buttons["play"].alpha = Opaque;
  buttons["stop"].alpha = isStopped ? Dimmed : Opaque;
  buttons["stop"].alpha = isRunning ? Opaque : Dimmed;
  buttons["reset"].alpha = !board.roundOver && isStopped ? Dimmed : Opaque;

  buttons["embiggen"].alpha =
  buttons["unbiggen"].alpha =
  buttons["shuffle"].alpha = isStopped ? Opaque : Dimmed;
  if (maxBoardSize == board.numRows) {
    buttons["embiggen"].alpha = Dimmed;
  }
  if (minBoardSize == board.numRows) {
    buttons["unbiggen"].alpha = Dimmed;
  }
}

//////////////// Audio ///////////////////////////

function loadAudio():void {
  let audio = new Audio("sounds/tbone.ogg");
  audio.volume = 0.75;
  sounds["tbone"] = audio;

  audio = new Audio("sounds/wetfoot.ogg");
  audio.volume = 0.5;
  sounds["wetfoot"] = audio;

  audio = new Audio("sounds/click.ogg");
  audio.volume = 1.0;
  sounds["click"] = audio;

  audio = new Audio("sounds/tada.ogg");
  audio.volume = 1.0;
  sounds["tada"] = audio;
}

///////////// Drawing ////////////////////////////

function initBoard(board:Checkerboard):void {
  let boardWidth:number = board.numColumns * CellSize;
  let boardHeight:number = board.numRows * CellSize;
  let surface = new PIXI.Graphics();
  surface.lineStyle(1, 0xffffff, 1);    // 16777215
  surface.beginFill(0x666666, 1);
  theBigBoard.addChild(surface);
  theBigBoard.position.set(spine - boardWidth/2, waistLine - boardHeight/2);

  stage.addChild(theBigBoard);
}

function updateCells():void {
  const normalCellColor:number = 0x666666;    // 13421772
  const occupiedCellColor:number = 0xcc33cc;  // 13382604
  const visitedCellColor:number = 0xcccc66;   // 13421670

  let penX:number = 0;
  let penY:number = 0;
  let boardGraphics = theBigBoard.getChildAt(0) as PIXI.Graphics;

  for (let row:number=0; row<board.numRows; row++) {
    penY = CellSize * row;

    for (let col:number=0; col<board.numColumns; col++) {
      penX = CellSize * col;
      let theCell:CheckerboardCell = board.getCell(row, col);
      let cellBGColor:number = normalCellColor;

      if (theCell.occupied) {
        cellBGColor = occupiedCellColor;
      } else if (theCell.visited) {
        cellBGColor = visitedCellColor;
      }
      boardGraphics.lineStyle(1, 0xffffff, 1);
      boardGraphics.beginFill(cellBGColor, 1);
      boardGraphics.drawRect(penX,penY, CellSize,CellSize);
      boardGraphics.endFill();

      switch (theCell.pointerDirection) {
        case Direction.Up:
          boardGraphics.moveTo(penX, penY + CellSize);
          boardGraphics.lineTo(penX + CellSize/2, penY);
          boardGraphics.lineTo(penX + CellSize, penY + CellSize);
          break;
        case Direction.Right:
          boardGraphics.moveTo(penX, penY);
          boardGraphics.lineTo(penX + CellSize, penY + CellSize/2);
          boardGraphics.lineTo(penX, penY + CellSize);
          break;
        case Direction.Down:
          boardGraphics.moveTo(penX, penY);
          boardGraphics.lineTo(penX + CellSize/2, penY + CellSize);
          boardGraphics.lineTo(penX + CellSize, penY);
          break;
        case Direction.Left:
          boardGraphics.moveTo(penX + CellSize, penY);
          boardGraphics.lineTo(penX, penY + CellSize/2);
          boardGraphics.lineTo(penX + CellSize, penY + CellSize);
          break;
        default:
          throw new Error("Bad direction given");
      }
    }
  }
}

function drawBoard():void {
  let hasEnded:boolean = board.roundOver;

  if (GameState.Running == gameState) {
    if (!hasEnded) {
      hasEnded = board.advanceCursor();
    }
    if (hasEnded) {
      gameState = GameState.Stopped;
    }
  }
  updateCells();
  updateUI();
  // statusField.text = (GameState.Stopped == gameState ? "S" : GameState.Paused == gameState ? "P" : "R");
  renderer.render(stage);
}

//////////// GameState ///////////////////////////

enum GameState {
  Stopped,
  Paused,
  Running
}

//////////// main ////////////////////////////////

const BoardMarginLeft:number = 512;
const BoardMarginTop:number = 20;
const waistLine:number = 350;
const spine:number = BoardMarginLeft + 384;
const CellSize:number = 48;
const minBoardSize:number = 3; // too simple
const maxBoardSize:number = 13;  // more won't fit

let theBigBoard:PIXI.Sprite = new PIXI.Sprite();

let sounds = {};
let sprites = {};
let buttons = {};
let statusField = new PIXI.Text("", {fontFamily:"Arial", fontSize:30, fill:0xffffff});
let gameState = GameState.Stopped;

console.log("And away we go");
loadAudio();
loadSprites();

let board = new Checkerboard(6, 6);
initBoard(board);

let heartbeatID:number = setInterval(drawBoard, 500);
animate();

function expandBoard():void {
  let numRows:number = board.numRows;
  if (numRows < maxBoardSize) {
    numRows++;
    board = new Checkerboard(numRows, numRows);
    initBoard(board);
  }
}

function shrinkBoard():void {
  let numRows:number = board.numRows;
  if (numRows > minBoardSize) {
    numRows--;
    board = new Checkerboard(numRows, numRows);
    initBoard(board);
  }
}

function handleButtonPress(e):void {
  let target:PIXI.Sprite = e.target as PIXI.Sprite;

  // low-budget enabled flag
  if (target.alpha < 1.0) {
    return;
  }
  switch (target.name) {
    case "playBtn":
      switch (gameState) {
        case GameState.Running:
          console.log("no playing during gameplay");
          return;
        case GameState.Stopped:
          board.reset();
          board.seedPath();
          // now fall through. still legal?
        case GameState.Paused:
          gameState = GameState.Running;
          break;
        default:
          console.log("You should never this fnord");
      }
      break;
    case "stopBtn":
      if (GameState.Running != gameState) {
        console.log("no stopping unless gameplay");
        return;
      }
      gameState = GameState.Paused;
      break;
    case "resetBtn":
      gameState = GameState.Stopped;
      board.reset();
      drawBoard();
      break;
    case "shuffleBtn":
      if (GameState.Running == gameState) {
        console.log("no shuffling during gameplay");
        return;
      }
      gameState = GameState.Stopped;
      (theBigBoard.getChildAt(0) as PIXI.Graphics).clear();
      board.createBoard(board.numRows, board.numColumns);
      drawBoard();
      break;
    case "embiggenBtn":
      (theBigBoard.getChildAt(0) as PIXI.Graphics).clear();
      expandBoard();
      break;
    case "unbiggenBtn":
      (theBigBoard.getChildAt(0) as PIXI.Graphics).clear();
      shrinkBoard();
      break;
    default:
      console.log("unhandled click on " + target.name);
      return;
  }
  sounds["click"].play();
  target.scale.x = target.scale.y = 0.90;
}

function handleButtonRelease(e):void {
  let target:PIXI.Sprite = e.target as PIXI.Sprite;

  if (null != target) {
    target.scale.x = target.scale.y = 1.0;
//  sounds["click"].play();
  }
}
