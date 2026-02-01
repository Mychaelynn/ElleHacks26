// --- 1. SETUP VARIABLES ---
var character = document.querySelector(".character");
var map = document.querySelector(".map");
var dialogBox = document.querySelector(".dialog-box");
var dialogText = document.getElementById("dialog-text");
var cleanPrompt = document.getElementById("clean-prompt"); // Get the E-key prompt

// Start coordinates
var x = 90;
var y = 34;
var held_directions = []; 
var speed = 1; 

// --- 2. GAME STATE & TARGETS ---
// The specific spot you want to clean (Screen Pixels)
var targetPixelX = 664; 
var targetPixelY = 352;

var kitchenState = {
   sink: { dirty: true, message_dirty: "Dishes everywhere!", message_clean: "Sparkling clean." },
   dishwasher: { dirty: true, message_dirty: "Empty.", message_clean: "Running." },
   trash: { dirty: true, message_dirty: "Overflowing!", message_clean: "Empty." },
   fridge: { dirty: false, message_dirty: "", message_clean: "Humming quietly." }
};

// --- 3. HELPER FUNCTIONS ---

// Check if player is near the specific "Press E" spot
function checkProximity() {
   var pixelSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pixel-size'));
   
   // Convert screen target pixels to game coordinates
   var targetGameX = targetPixelX / pixelSize;
   var targetGameY = targetPixelY / pixelSize;

   var dist = Math.sqrt(
      Math.pow(x - targetGameX, 2) + 
      Math.pow(y - targetGameY, 2)
   );

   if (dist < 15) {
      if(cleanPrompt) cleanPrompt.classList.remove("hidden");
   } else {
      if(cleanPrompt) cleanPrompt.classList.add("hidden");
   }
}

// Check proximity to generic objects (red boxes)
function checkInteraction() {
    const objects = document.querySelectorAll('.object');
    let nearbyObject = null;
    objects.forEach(obj => {
       const pixelSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pixel-size'));
       const objRect = obj.getBoundingClientRect();
       const mapRect = map.getBoundingClientRect();
       const objX = (objRect.left - mapRect.left) / pixelSize;
       const objY = (objRect.top - mapRect.top) / pixelSize;
       const dist = Math.sqrt(Math.pow(x - objX, 2) + Math.pow(y - objY, 2));
 
       if (dist < 20) {
          nearbyObject = obj;
       }
    });
    return nearbyObject;
 }

function showDialog(text) {
   dialogText.innerText = text;
   dialogBox.classList.remove("hidden");
   setTimeout(() => {
      dialogBox.classList.add("hidden");
   }, 2000);
}

// --- 4. MOVEMENT LOGIC ---
const placeCharacter = () => {
   var pixelSize = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--pixel-size')
   );
   
   const held_direction = held_directions[0];
   if (held_direction) {
      if (held_direction === directions.right) {x += speed;}
      if (held_direction === directions.left) {x -= speed;}
      if (held_direction === directions.down) {y += speed;}
      if (held_direction === directions.up) {y -= speed;}
      character.setAttribute("facing", held_direction);
   }
   character.setAttribute("walking", held_direction ? "true" : "false");
   
   // WALL LIMITS
   var leftLimit = -8;
   var rightLimit = (16 * 20) + 8; // Expanded width
   var topLimit = -8 + 32;
   var bottomLimit = (16 * 20);    // Expanded height

   if (x < leftLimit) { x = leftLimit; }
   if (x > rightLimit) { x = rightLimit; }
   if (y < topLimit) { y = topLimit; }
   if (y > bottomLimit) { y = bottomLimit; }
   
   var camera_left = pixelSize * 66;
   var camera_top = pixelSize * 42;
   
   map.style.transform = `translate3d( ${-x*pixelSize+camera_left}px, ${-y*pixelSize+camera_top}px, 0 )`;
   character.style.transform = `translate3d( ${x*pixelSize}px, ${y*pixelSize}px, 0 )`;  
}

// --- 5. THE GAME LOOP ---
const step = () => {
   placeCharacter();
   checkProximity(); // Check for the "E" prompt every frame
   window.requestAnimationFrame(() => {
      step();
   })
}

step(); // Start the game!

// --- 6. CONTROLS ---

// "E" Key Listener
document.addEventListener("keydown", (e) => {
   if (!cleanPrompt.classList.contains("hidden") && (e.code === "KeyE" || e.key === "e")) {
      alert("You cleaned the spot!"); 
      cleanPrompt.classList.add("hidden");
   }
});

// Spacebar Listener
document.addEventListener("keydown", (e) => {
   if (e.code === "Space" || e.code === "Enter") {
      const obj = checkInteraction();
      if (obj) {
         const name = obj.dataset.name;
         const item = kitchenState[name];
         if (item && item.dirty) {
            item.dirty = false;
            obj.classList.add("clean");
            showDialog(`You cleaned the ${name}!`);
         } else if (item) {
            showDialog(item.message_clean);
         }
      }
   }
});

// Movement Keys
const directions = {
   up: "up", down: "down", left: "left", right: "right",
}
const keys = {
   38: directions.up, 37: directions.left, 39: directions.right, 40: directions.down,
}

document.addEventListener("keydown", (e) => {
   var dir = keys[e.which];
   if (dir && held_directions.indexOf(dir) === -1) {
      held_directions.unshift(dir)
   }
})

document.addEventListener("keyup", (e) => {
   var dir = keys[e.which];
   var index = held_directions.indexOf(dir);
   if (index > -1) {
      held_directions.splice(index, 1)
   }
});

// Touch/Mouse Controls (D-PAD)
var isPressed = false;
const removePressedAll = () => {
   document.querySelectorAll(".dpad-button").forEach(d => {
      d.classList.remove("pressed")
   })
}
document.body.addEventListener("mousedown", () => { isPressed = true; })
document.body.addEventListener("mouseup", () => { isPressed = false; held_directions = []; removePressedAll(); })
const handleDpadPress = (direction, click) => {   
   if (click) { isPressed = true; }
   held_directions = (isPressed) ? [direction] : []
   if (isPressed) {
      removePressedAll();
      document.querySelector(".dpad-"+direction).classList.add("pressed");
   }
}
// Add your dpad event listeners here (left as is in your original code)
document.querySelector(".dpad-left").addEventListener("mousedown", (e) => handleDpadPress(directions.left, true));
document.querySelector(".dpad-up").addEventListener("mousedown", (e) => handleDpadPress(directions.up, true));
document.querySelector(".dpad-right").addEventListener("mousedown", (e) => handleDpadPress(directions.right, true));
document.querySelector(".dpad-down").addEventListener("mousedown", (e) => handleDpadPress(directions.down, true));