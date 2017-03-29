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

function animate() {
    // start the timer for the next animation loop
    requestAnimationFrame(animate);

    // each frame we spin the bunny around a bit
    bunny.rotation += 0.01;

    // this is the main render call that makes pixi draw your container and its children.
    renderer.render(stage);
}
*/

//////////////////////////////////////////////////

enum Direction {
  Up = 1,
  Down,
  Left,
  Right
}

////////////// Checkerboard //////////////////////

class Checkerboard {

  isDirty:boolean = false;

  private grid:CheckerboardCell[][];
  private cursorPosition:PIXI.Point = new PIXI.Point(-1, -1);

  constructor(numRows:number, numColumns:number) {
    const minSize:number = 3; // too simple
    const maxSize:number = 41;  // more won't fit

    if (numRows >= minSize) {
      if (numColumns >= minSize) {
        if (numColumns <= maxSize) {
          if (numRows <= maxSize) {
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
    this.isDirty = true;
  }

  advanceCursor():void {
    if (this.cursorPosition.x < 0) {
      return; // no cursor, no go
    }
    if (!hasEnded) {
      let currentCell:CheckerboardCell = this.getCell(this.cursorPosition.y, this.cursorPosition.x);
      let nextPosition:PIXI.Point = this.findNext(this.cursorPosition.y, this.cursorPosition.x, currentCell.pointerDirection);
      if (null != nextPosition) {
        let nextCell:CheckerboardCell = this.getCell(nextPosition.y, nextPosition.x);
        if (!nextCell.visited) {
          this.occupyCell(nextPosition.y, nextPosition.x);
          currentCell.occupied = false;
        } else {
          hasEnded = true;
          isRunning = false;
          sounds["tbone"].play();
        }
      } else {
        hasEnded = true;
        isRunning = false;
        sounds["tada"].play();
      }
    }
  }

  occupyCell(row:number, col:number):void {
    sounds["wetfoot"].play();

    let theCell:CheckerboardCell = this.getCell(row, col);
    theCell.occupied = theCell.visited = true;
    this.isDirty = true;

    this.cursorPosition.x = col;
    this.cursorPosition.y = row;
  }

  getCell(row:number, col:number):CheckerboardCell {
    return this.grid[row][col];
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

  probe(row:number, col:number):boolean {
    return willLoop(this.grid[row][col]);
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
    .add("playBtn", "images/playBtn.png")
    .add("stopBtn", "images/stopBtn.png")
    .add("resetBtn", "images/resetBtn.png")
    .add("shuffleBtn", "images/shuffleBtn.png")
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
  const MarginLeft:number = 208;

  statusField.x = MarginLeft;
  statusField.y = 720 - 64;
  stage.addChild(statusField);

  stage.addChild(makeButton("playBtn", MarginLeft, 80));
  stage.addChild(makeButton("stopBtn", MarginLeft, 220));
  stage.addChild(makeButton("resetBtn", MarginLeft, 360));
  stage.addChild(makeButton("shuffleBtn", MarginLeft, 500));

  updateCells();

  renderer.render(stage);
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

function seedBoard():void {
  const openBorderColor:number = 0x33cc33;
  const walledBorderColor:number = 0xcc3333;

  let seed:PIXI.Point = new PIXI.Point(randomInt(0,board.numRows-1), randomInt(0, board.numColumns-1));
  board.occupyCell(seed.x, seed.y);

  let hasLoop:boolean = board.probe(seed.x, seed.y);
  console.log("from " + seed.x + "," + seed.y + " we can " + (hasLoop ? "not " : "")+ "escape");
}

function initBoard(board:Checkerboard):void {
  boardGraphics.position.set(BoardMarginLeft, BoardMarginTop);
  boardGraphics.lineStyle(1, 0xffffff, 1);
  boardGraphics.beginFill(0x666666, 1);

  stage.addChild(boardGraphics);
}

function updateCells():void {
  // if (!board.isDirty) {
  //   console.log("no can update clean grid");
  //   return;
  // }
  const normalCellColor:number = 0x666666;
  const occupiedCellColor:number = 0xcc33cc;
  const visitedCellColor:number = 0xcccc66;

  let penX:number = 0;
  let penY:number = 0;

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
  //board.isDirty = false;
}

function drawBoard():void {
  // if (!isRunning) {
  //   console.log("drawBoard bails: not running");
  //   return;
  // }
  updateCells();
  renderer.render(stage);
  //board.isDirty = false;
  if (!hasEnded) {
    console.log("Let's keep on going");
    board.advanceCursor();
  }
  // statusField.text = (isRunning ? " RUN" : "HALT") + " " + (hasEnded ? "LIVE" : "DEAD");
}

//////////// main ////////////////////////////////

const BoardMarginLeft:number = 512;
const BoardMarginTop:number = 20;
const CellSize:number = 16;

let boardGraphics:PIXI.Graphics = new PIXI.Graphics();

let sounds = {};
let sprites = {};
let statusField = new PIXI.Text("", {fontFamily:"Arial", fontSize:32, fill:0xffffff});

let isRunning:boolean = false;
let hasEnded:boolean = false;

console.log("And away we go");
loadAudio();

let board = new Checkerboard(41, 41);
initBoard(board);
loadSprites();

//drawBoard();
let heartbeatID:number = setInterval(drawBoard, 500);

function handleButtonPress(e):void {
  let target:PIXI.Sprite = e.target as PIXI.Sprite;
  switch (target.name) {
    case "playBtn":
      if (!isRunning) {
        seedBoard();
        isRunning = true;
      } else {
        console.log("playBtn fail: already running");
      }
      break;
    case "stopBtn":
      console.log("stop means stop");
      isRunning = false;
      break;
    case "resetBtn":
      isRunning = false;
      // hasEnded = false;
      boardGraphics.clear();
      board.createBoard(board.numRows, board.numColumns);
      updateCells();
      renderer.render(stage);
      break;
    case "shuffleBtn":
      break;
    default:
      console.log("unhandled click on " + target.name);
      return;
  }
  sounds["click"].play();
  target.scale.x = target.scale.y = 0.83;
}

function handleButtonRelease(e):void {
  let target:PIXI.Sprite = e.target as PIXI.Sprite;
  target.scale.x = target.scale.y = 1.0;
  sounds["click"].play();
}
