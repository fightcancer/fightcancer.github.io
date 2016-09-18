/**
 * Initialize the Game and starts it.
 */
var game = new Game();
function init() {
    if(game.init())
        game.start();
}

/**
 * Define an object to hold all our images for the game so images
 * are only ever created once. This type of object is known as a
 * singleton.
 */
var imageRepository = new function() {
    // Define images
    this.background = new Image();
    this.ribbon = new Image();
    this.bullet = new Image();
    this.cancer = new Image();
    // Ensure all images have loaded before starting the game
    var numImages = 4;
    var numLoaded = 0;
    function imageLoaded() {
        numLoaded++;
        if (numLoaded === numImages) {
            window.init();
        }
    }
    this.background.onload = function() {
        imageLoaded();
    };
    this.ribbon.onload = function() {
        imageLoaded();
    };
    this.bullet.onload = function() {
        imageLoaded();
    };
    this.cancer.onload = function() {
        imageLoaded();
    };
    // Set images src
    this.background.src = "img/bg.png";
    this.ribbon.src = "img/ribbon.png";
    this.bullet.src = "img/bullet.png";
    this.cancer.src = "img/cancer.png";
};

/**
 * Creates the Drawable object which will be the base class for
 * all drawable objects in the game. Sets up default variables
 * that all child objects will inherit, as well as the default
 * functions.
 */
function Drawable() {
    this.init = function(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    };
    this.speed = 0;
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    this.collidableWith = "";
    this.isColliding = false;
    this.type = "";
    // Define abstract function to be implemented in child objects
    this.draw = function() {
    };
    this.move = function() {
    };
    this.isCollidableWith = function(object) {
        return (this.collidableWith === object.type);
    };
}

/**
 * Creates the Background object which will become a child of
 * the Drawable object. The background is drawn on the "background"
 * canvas and creates the illusion of moving by panning the image.
 */
function Background() {
    this.speed = 1; // Redefine speed of the background for panning
    // Implement abstract function
    this.draw = function() {

        // Pan background
        this.y += this.speed;
        this.context.drawImage(imageRepository.background, this.x, this.y);
        // Draw another image at the top edge of the first image
        this.context.drawImage(imageRepository.background, this.x, this.y - this.canvasHeight);
        // If the image scrolled off the screen, reset
        if (this.y >= this.canvasHeight)
            this.y = 0;
    };
}
// Set Background to inherit properties from Drawable
Background.prototype = new Drawable();

function Cancer() {
    this.alive = false;
    this.collidableWith = "bullet";
    this.type = "cancer";

    this.spawn = function(x, y, speed) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.speedX = 0;
        this.speedY = speed;
        this.alive = true;
        this.leftEdge = this.x - 45;
        this.rightEdge = this.x - 30;
        this.bottomEdge = this.y + 185;
        this.topEdge = this.y;
    };

    this.draw = function() {
        this.context.clearRect(this.x-1, this.y, this.width+1, this.height);
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x <= this.leftEdge) {
            this.speedX = this.speed;
            //this.speedY = -1;
        }
        else if (this.x >= this.rightEdge + this.width) {
            this.speedX = -this.speed;
            //this.speedY = 1;
        }
        else if (this.y >= this.bottomEdge) {
            this.speed = 1.1;
            this.speedY = 0;
            this.y -= 5;
            this.speedX = -this.speed;
        }

        if (!this.isColliding) {
            this.context.drawImage(imageRepository.cancer, this.x, this.y);
            return false;
        } else {
            game.playerScore += 1;
            return true;
        }
    };

    this.clear = function() {
        this.x = 0;
        this.y = 0;
        this.speed = 0;
        this.speedX = 0;
        this.speedY = 0;
        this.alive = false;
        this.isColliding = false;
    };
}
Cancer.prototype = new Drawable();

/**
 * Creates the Bullet object which the ribbon fires. The bullets are
 * drawn on the "main" canvas.
 */
function Bullet() {
    this.alive = false; // Is true if the bullet is currently in use
    /*
     * Sets the bullet values
     */
    this.spawn = function(x, y, speed) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.alive = true;
    };
    /*
     * Uses a "drity rectangle" to erase the bullet and moves it.
     * Returns true if the bullet moved off the screen, indicating that
     * the bullet is ready to be cleared by the pool, otherwise draws
     * the bullet.
     */
    this.draw = function() {
        this.context.clearRect(this.x-1, this.y-1, this.width+2, this.height+2);
        this.y -= this.speed;
        if (this.isColliding) {
            return true;
        }
        else if (this.y <= 0 - this.height) {
            return true;
        }
        else {
            this.context.drawImage(imageRepository.bullet, this.x, this.y);
            return false;
        }
    };
    /*
     * Resets the bullet values
     */
    this.clear = function() {
        this.x = 0;
        this.y = 0;
        this.speed = 0;
        this.alive = false;
        this.isColliding = false;
    };
}
Bullet.prototype = new Drawable();


/**
 * Create the ribbon object that the player controls. The ribbon is
 * drawn on the "ribbon" canvas and uses dirty rectangles to move
 * around the screen.
 */
function Ribbon() {
    this.speed = 3;
    this.bulletPool = new Pool(30);
    this.bulletPool.init("bullet");
    var fireRate = 12;
    var counter = 0;
    this.type = "ribbon";
    this.draw = function() {
        this.context.drawImage(imageRepository.ribbon, this.x, this.y);
    };
    this.move = function() {
        counter++;
        // Determine if the action is move action
        if (KEY_STATUS.left || KEY_STATUS.right ||
            KEY_STATUS.down || KEY_STATUS.up) {
            // The ribbon moved, so erase it's current image so it can
            // be redrawn in it's new location
            this.context.clearRect(this.x, this.y, this.width, this.height);
            // Update x and y according to the direction to move and
            // redraw the ribbon. Change the else if's to if statements
            // to have diagonal movement.
            if (KEY_STATUS.left) {
                this.x -= this.speed;
                if (this.x <= 0) // Keep player within the screen
                    this.x = 0;
            } else if (KEY_STATUS.right) {
                this.x += this.speed;
                if (this.x >= this.canvasWidth - this.width)
                    this.x = this.canvasWidth - this.width;
            } else if (KEY_STATUS.up) {
                this.y -= this.speed;
                if (this.y <= this.canvasHeight/4*3)
                    this.y = this.canvasHeight/4*3;
            } else if (KEY_STATUS.down) {
                this.y += this.speed;
                if (this.y >= this.canvasHeight - this.height)
                    this.y = this.canvasHeight - this.height;
            }
            // Finish by redrawing the ribbon
            if (!this.isColliding) {
                this.draw();
            }
        }
        if (KEY_STATUS.space && counter >= fireRate && !this.isColliding) {
            this.fire();
            counter = 0;
        }
    };
    /*
     * Fires two bullets
     */
    this.fire = function() {
        this.bulletPool.getTwo(this.x+2, this.y-8, 3,
            this.x+29, this.y-8, 3);
    };
}
Ribbon.prototype = new Drawable();

// The keycodes that will be mapped when a user presses a button.
// Original code by Doug McInnes
KEY_CODES = {
    32: 'space',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
};
// Creates the array to hold the KEY_CODES and sets all their values
// to false. Checking true/flase is the quickest way to check status
// of a key press and which one was pressed when determining
// when to move and which direction.
KEY_STATUS = {};
for (code in KEY_CODES) {
    KEY_STATUS[KEY_CODES[code]] = false;
}
/**
 * Sets up the document to listen to onkeydown events (fired when
 * any key on the keyboard is pressed down). When a key is pressed,
 * it sets the appropriate direction to true to let us know which
 * key it was.
 */
document.onkeydown = function(e) {
    // Firefox and opera use charCode instead of keyCode to
    // return which key was pressed.
    var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
    if (KEY_CODES[keyCode]) {
        e.preventDefault();
        KEY_STATUS[KEY_CODES[keyCode]] = true;
    }
};
/**
 * Sets up the document to listen to ownkeyup events (fired when
 * any key on the keyboard is released). When a key is released,
 * it sets teh appropriate direction to false to let us know which
 * key it was.
 */
document.onkeyup = function(e) {
    var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
    if (KEY_CODES[keyCode]) {
        e.preventDefault();
        KEY_STATUS[KEY_CODES[keyCode]] = false;
    }
};

/**
 * Custom Pool object. Holds Bullet objects to be managed to prevent
 * garbage collection.
 */
function Pool(maxSize) {
    var size = maxSize; // Max bullets allowed in the pool
    var pool = [];
    /*
     * Populates the pool array with Bullet objects
     */
    this.init = function(object) {
        if (object == "bullet") {
            for (var i = 0; i < size; i++) {
                // Initalize the object
                var bullet = new Bullet();
                bullet.init(0,0, imageRepository.bullet.width, imageRepository.bullet.height);
                bullet.collidableWith = "enemy";
                bullet.type = "bullet";
                pool[i] = bullet;
            }
        }
        else if (object == "cancer") {
            for (var i = 0; i < size; i++) {
                var cancer = new Cancer();
                cancer.init(0,0, imageRepository.cancer.width, imageRepository.cancer.height);
                pool[i] = cancer;
            }
        }
    };
    /*
     * Grabs the last item in the list and initializes it and
     * pushes it to the front of the array.
     */
    this.get = function(x, y, speed) {
        if(!pool[size - 1].alive) {
            pool[size - 1].spawn(x, y, speed);
            pool.unshift(pool.pop());
        }
    };
    /*
     * Used for the ribbon to be able to get two bullets at once. If
     * only the get() function is used twice, the ribbon is able to
     * fire and only have 1 bullet spawn instead of 2.
     */
    this.getTwo = function(x1, y1, speed1, x2, y2, speed2) {
        if(!pool[size - 1].alive &&
            !pool[size - 2].alive) {
            this.get(x1, y1, speed1);
            this.get(x2, y2, speed2);
        }
    };

    this.getPool = function() {
        var obj = [];
        for (var i = 0; i < size; i++) {
            if (pool[i].alive) {
                obj.push(pool[i]);
            }
        }
        return obj;
    };

    /*
     * Draws any in use Bullets. If a bullet goes off the screen,
     * clears it and pushes it to the front of the array.
     */
    this.animate = function() {
        for (var i = 0; i < size; i++) {
            // Only draw until we find a bullet that is not alive
            if (pool[i].alive) {
                if (pool[i].draw()) {
                    pool[i].clear();
                    pool.push((pool.splice(i,1))[0]);
                }
            }
            else
                break;
        }
    };
}

/**
 * QuadTree object.
 *
 * The quadrant indexes are numbered as below:
 *     |
 *  1  |  0
 * —-+—-
 *  2  |  3
 *     |
 */
function QuadTree(boundBox, lvl) {
    var maxObjects = 10;
    this.bounds = boundBox || {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
    var objects = [];
    this.nodes = [];
    var level = lvl || 0;
    var maxLevels = 5;
    /*
     * Clears the quadTree and all nodes of objects
     */
    this.clear = function() {
        objects = [];
        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].clear();
        }
        this.nodes = [];
    };
    /*
     * Get all objects in the quadTree
     */
    this.getAllObjects = function(returnedObjects) {
        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].getAllObjects(returnedObjects);
        }
        for (var i = 0, len = objects.length; i < len; i++) {
            returnedObjects.push(objects[i]);
        }
        return returnedObjects;
    };
    /*
     * Return all objects that the object could collide with
     */
    this.findObjects = function(returnedObjects, obj) {
        if (typeof obj === "undefined") {
            console.log("UNDEFINED OBJECT");
            return;
        }
        var index = this.getIndex(obj);
        if (index != -1 && this.nodes.length) {
            this.nodes[index].findObjects(returnedObjects, obj);
        }
        for (var i = 0, len = objects.length; i < len; i++) {
            returnedObjects.push(objects[i]);
        }
        return returnedObjects;
    };
    /*
     * Insert the object into the quadTree. If the tree
     * excedes the capacity, it will split and add all
     * objects to their corresponding nodes.
     */
    this.insert = function(obj) {
        if (typeof obj === "undefined") {
            return;
        }
        if (obj instanceof Array) {
            for (var i = 0, len = obj.length; i < len; i++) {
                this.insert(obj[i]);
            }
            return;
        }
        if (this.nodes.length) {
            var index = this.getIndex(obj);
            // Only add the object to a subnode if it can fit completely
            // within one
            if (index != -1) {
                this.nodes[index].insert(obj);
                return;
            }
        }
        objects.push(obj);
        // Prevent infinite splitting
        if (objects.length > maxObjects && level < maxLevels) {
            if (this.nodes[0] == null) {
                this.split();
            }
            var i = 0;
            while (i < objects.length) {
                var index = this.getIndex(objects[i]);
                if (index != -1) {
                    this.nodes[index].insert((objects.splice(i,1))[0]);
                }
                else {
                    i++;
                }
            }
        }
    };
    /*
     * Determine which node the object belongs to. -1 means
     * object cannot completely fit within a node and is part
     * of the current node
     */
    this.getIndex = function(obj) {
        var index = -1;
        var verticalMidpoint = this.bounds.x + this.bounds.width / 2;
        var horizontalMidpoint = this.bounds.y + this.bounds.height / 2;
        // Object can fit completely within the top quadrant
        var topQuadrant = (obj.y < horizontalMidpoint && obj.y + obj.height < horizontalMidpoint);
        // Object can fit completely within the bottom quandrant
        var bottomQuadrant = (obj.y > horizontalMidpoint);
        // Object can fit completely within the left quadrants
        if (obj.x < verticalMidpoint &&
            obj.x + obj.width < verticalMidpoint) {
            if (topQuadrant) {
                index = 1;
            }
            else if (bottomQuadrant) {
                index = 2;
            }
        }
        // Object can fix completely within the right quandrants
        else if (obj.x > verticalMidpoint) {
            if (topQuadrant) {
                index = 0;
            }
            else if (bottomQuadrant) {
                index = 3;
            }
        }
        return index;
    };
    /*
     * Splits the node into 4 subnodes
     */
    this.split = function() {
        // Bitwise or [html5rocks]
        var subWidth = (this.bounds.width / 2) | 0;
        var subHeight = (this.bounds.height / 2) | 0;
        this.nodes[0] = new QuadTree({
            x: this.bounds.x + subWidth,
            y: this.bounds.y,
            width: subWidth,
            height: subHeight
        }, level+1);
        this.nodes[1] = new QuadTree({
            x: this.bounds.x,
            y: this.bounds.y,
            width: subWidth,
            height: subHeight
        }, level+1);
        this.nodes[2] = new QuadTree({
            x: this.bounds.x,
            y: this.bounds.y + subHeight,
            width: subWidth,
            height: subHeight
        }, level+1);
        this.nodes[3] = new QuadTree({
            x: this.bounds.x + subWidth,
            y: this.bounds.y + subHeight,
            width: subWidth,
            height: subHeight
        }, level+1);
    };
}

/**
 * Creates the Game object which will hold all objects and data for
 * the game.
 */
function Game() {
    /*
     * Gets canvas information and context and sets up all game
     * objects.
     * Returns true if the canvas is supported and false if it
     * is not. This is to stop the animation script from constantly
     * running on browsers that do not support the canvas.
     */
    this.init = function() {
        // Get the canvas elements
        this.bgCanvas = document.getElementById('background');
        this.ribbonCanvas = document.getElementById('ribbon');
        this.mainCanvas = document.getElementById('main');
        this.playerScore = 0;
        // Test to see if canvas is supported. Only need to
        // check one canvas
        if (this.bgCanvas.getContext) {
            this.bgContext = this.bgCanvas.getContext('2d');
            this.ribbonContext = this.ribbonCanvas.getContext('2d');
            this.mainContext = this.mainCanvas.getContext('2d');

            // Initialize objects to contain their context and canvas info
            Background.prototype.context = this.bgContext;
            Background.prototype.canvasWidth = this.bgCanvas.width;
            Background.prototype.canvasHeight = this.bgCanvas.height;

            Ribbon.prototype.context = this.ribbonContext;
            Ribbon.prototype.canvasWidth = this.ribbonCanvas.width;
            Ribbon.prototype.canvasHeight = this.ribbonCanvas.height;

            Bullet.prototype.context = this.mainContext;
            Bullet.prototype.canvasWidth = this.mainCanvas.width;
            Bullet.prototype.canvasHeight = this.mainCanvas.height;

            Cancer.prototype.context = this.mainContext;
            Cancer.prototype.canvasWidth = this.mainCanvas.width;
            Cancer.prototype.canvasHeight = this.mainCanvas.height;
            // Initialize the background object
            this.background = new Background();
            this.background.init(0, 0); // Set draw point to 0,0
            // Initialize the ribbon object
            this.ribbon = new Ribbon();
            // Set the ribbon to start near the bottom middle of the canvas
            var ribbonStartX = this.ribbonCanvas.width/2 - imageRepository.ribbon.width;
            var ribbonStartY = this.ribbonCanvas.height/4*3 + imageRepository.ribbon.height*2;
            this.ribbon.init(ribbonStartX, ribbonStartY, imageRepository.ribbon.width,
                imageRepository.ribbon.height);

            this.cancerPool = new Pool(30);
            this.cancerPool.init("cancer");
            this.spawnWave();
            var height = imageRepository.cancer.height;
            var width = imageRepository.cancer.width;
            var x = 100;
            var y = -height;
            var spacer = y * 1.5;
            for (var i = 1; i <= 18; i++) {
                this.cancerPool.get(x,y,2);
                x += width + 25;
                if (i % 6 == 0) {
                    x = 100;
                    y += spacer
                }
            }
            this.quadTree = new QuadTree({x:0,y:0,width:this.mainCanvas.width,height:this.mainCanvas.height});
            return true;
        } else {
            return false;
        }
    };
    // Start the animation loop
    this.start = function() {
        this.ribbon.draw();
        animate();
    };
    // Spawn a new wave of enemies
    this.spawnWave = function() {
        var height = imageRepository.cancer.height;
        var width = imageRepository.cancer.width;
        var x = 100;
        var y = -height;
        var spacer = y * 1.5;
        for (var i = 1; i <= 18; i++) {
            this.cancerPool.get(x,y,2);
            x += width + 25;
            if (i % 6 == 0) {
                x = 100;
                y += spacer
            }
        }
    };
    // Game over
    this.gameOver = function() {
        document.getElementById('game-over').style.display = "block";
    };
// Restart the game
    this.restart = function() {
        document.getElementById('game-over').style.display = "none";
        this.bgContext.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        this.ribbonContext.clearRect(0, 0, this.ribbonCanvas.width, this.ribbonCanvas.height);
        this.mainContext.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.quadTree.clear();
        this.background.init(0,0);
        this.ribbon.init(this.ribbonStartX, this.ribbonStartY,
            imageRepository.ribbon.width, imageRepository.ribbon.height);
        this.cancerPool.init("cancer");
        this.spawnWave();
        this.playerScore = 0;
        this.start();
    };
}

function detectCollision() {
    var objects = [];
    game.quadTree.getAllObjects(objects);
    for (var x = 0, len = objects.length; x < len; x++) {
        game.quadTree.findObjects(obj = [], objects[x]);

        for (y = 0, length = obj.length; y < length; y++) {

            // DETECT COLLISION ALGORITHM
            if (objects[x].collidableWith === obj[y].type &&
                (objects[x].x < obj[y].x + obj[y].width &&
                objects[x].x + objects[x].width > obj[y].x &&
                objects[x].y < obj[y].y + obj[y].height &&
                objects[x].y + objects[x].height > obj[y].y)) {
                objects[x].isColliding = true;
                obj[y].isColliding = true;
            }
        }
    }
}

/**
 * The animation loop. Calls the requestAnimationFrame shim to
 * optimize the game loop and draws all game objects. This
 * function must be a gobal function and cannot be within an
 * object.
 */
function animate() {
    document.getElementById('score').innerHTML = game.playerScore;

    game.quadTree.clear();
    game.quadTree.insert(game.ribbon);
    game.quadTree.insert(game.ribbon.bulletPool.getPool());
    game.quadTree.insert(game.cancerPool.getPool());
    detectCollision();
    if (game.cancerPool.getPool().length === 0) {
        game.spawnWave();
    }
    // if (game.ribbon.alive) {
        requestAnimFrame(animate);
        game.background.draw();
        game.ribbon.move();
        game.ribbon.bulletPool.animate();
        game.cancerPool.animate();
    // }
}

/**
 * requestAnim shim layer by Paul Irish
 * Finds the first API that works to optimize the animation loop,
 * otherwise defaults to setTimeout().
 */
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame   ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(/* function */ callback, /* DOMElement */ element){
            window.setTimeout(callback, 1000 / 60);
        };
})();
