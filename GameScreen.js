
const xlinkNamespace = "http://www.w3.org/1999/xlink";
const svgNamespace = "http://www.w3.org/2000/svg";

document.body.classList.add('js-loading');

const debug = false;


class audioFile {
	constructor(filename) {
		this.filename = filename;
		this.DOMwrapper = document.createElement("audio");
		
		this.source = document.createElement("source");
		this.source.src = `music/${filename}`;
		this.DOMwrapper.append(this.source);
		
		this.DOMwrapper.load();
		document.body.append(this.DOMwrapper);
	}
	
	set time(t) {
		this.DOMwrapper.currentTime = t;
	}
	
	get duration() {
		return this.DOMwrapper.duration;
	}
	
	play() {
		this.DOMwrapper.play();
	}
	
	pause() {
		this.DOMwrapper.pause();
	}
	
	setVolume(value) {
		this.DOMwrapper.volume = value;
	}
}

class musicLibrary {
	constructor() {
		this.songList = {
			introMusic: new audioFile('IntroMusic.mp3'),
			mapMusic: new audioFile('MapMusic.m4a'),
			looseHangman: new audioFile('LooseHangman.ogg'),
			getItem: new audioFile('GetItem.ogg'),
			wallMusic: new audioFile('WallMusic.m4a'),
			playhouseMusic: new audioFile('PlayhouseMusic.m4a'),
			gameMusic: new audioFile('GameMusic.m4a'),
			eatFries: new audioFile('EatFries.m4a'),
			correctAnswer: new audioFile('CorrectAnswer.ogg'),
			wrongAnswer: new audioFile('WrongAnswer.ogg'),
			quizMusic: new audioFile('QuizMusic.mp3'),
			floppyFail: new audioFile('FloppyFail.ogg')
		};
		
		this.songIndex = 0;
		this.playlist = false;
		this.currentSong = 'none';
	}
	
	playSong(id) {
		// stop last song
		if (this.currentSong !== 'none') {
			this.currentSong.pause();
			clearTimeout(this.timer);
		}
		
		// play new song
		this.currentSong = this.songList[id];
		this.playLoop(id);
	}
	
	playLoop(id) {
		this.currentSong.time = 0;
		this.currentSong.play();
		
		// set a timer to restart song after it finishes
		const duration = Math.round(this.currentSong.duration) + 2;
		if (isNaN(duration)) {
			console.log('no duration');
		}
		this.timer = setTimeout(function(){
			jukebox.playLoop(id);
		}, duration * 1000);
		//console.log(`Playing song: ${id} (duration: ${duration})`);
	}
	
	stopMusic() {
		this.currentSong.pause();
		clearTimeout(this.timer);
		this.currentSong = 'none';
	}
	
	playSound(id) {
		this.songList[id].time = 0;
		this.songList[id].play();
	}
}

class dialogClass {
	constructor() {
		this.DOMwrapper = document.getElementById('dialogBox');
		this.spanList = [];
		this.status = 'idle';
	}
	
	startDialog(dialog, whoYaGonnaCall) {
		if (gameloop.currentHandler === this || gameloop.currentHandler === typewriter) {
			// another message is showing right now... try again later
			const root = this;
			setTimeout(function(){
				root.startDialog(dialog, whoYaGonnaCall);
			}, 10000);
			console.log('dialog: wait!');
		} else {
			this.whoYaGonnaCall = whoYaGonnaCall;
			this.dialog = dialog;
		
			// overtake menu and gamepad
			this.location = gameloop.currentHandler;
			this.lastMenu = menu.list;
			gameloop.currentHandler = this;
			menu.setMenu({buttonArrows: 'choose answer', buttonB: 'respond'});
		
			this.lastDialog = 'start';
			this.updateBox(dialog.start);
		}
	}
	
	set selectedAnswer(n) {
		const span = this.spanList[n];
		if (span && n>0) {
			this.spanList[this._selectedAnswer].classList.remove('selected');
			span.classList.add('selected');
			this._selectedAnswer = n;
		}
	}
	
	get selectedAnswer() {
		return this._selectedAnswer;
	}
	
	updateBox(textList) {
		// remove old dialog
		this.spanList.forEach(span => span.remove());
		this.spanList = [];
		
		// add starting text
		this.addSpan(textList.text, `dialogText ${this.dialog.class}`);
		for (let i=1; i<6; i++) {
			const text = textList[`answer${i}`];
			if (text) {
				this.addSpan(text[0], 'dialogAnswers');
			} else {
				break;
			}
		}
		
		if (this.spanList.length > 1) {
			// there is at least one possible answer
			this._selectedAnswer = 1;
			this.selectedAnswer = 1;
			this.status = 'choose';
		} else {
			// no more answers -> this is the end of the conversation
			menu.setMenu({buttonB: 'leave'});
			this.status = 'end';
		}
		
		this.DOMwrapper.style.opacity = 1;
	}
	
	addSpan(text, type) {
		const span = document.createElement('span');
		span.className = type;
		span.innerHTML = text;
		this.DOMwrapper.append(span);
		this.spanList.push(span);
	}
	
	keyPressed(changes) {
		if (changes.B === 1) {
			if (this.status === 'end') {
				// we reached an impass
				this.leave();
			} else {
				// answer is chosen
				this.answerChosen();
				this.status = 'busy';
			}
		} else if (changes.UpDown === -1 && this.status === 'choose') {
			// up
			this.selectedAnswer = this.selectedAnswer - 1;
		} else if (changes.UpDown === 1 && this.status === 'choose') {
			// down
			this.selectedAnswer = this.selectedAnswer + 1;
		}
	}
	
	answerChosen() {
		const nextDialog = this.dialog[this.lastDialog][`answer${this.selectedAnswer}`][1];
		
		if (nextDialog === 'end') {
			this.leave();
		} else {
			this.lastDialog = nextDialog;
			this.DOMwrapper.style.opacity = 0;
			
			const root = this;
			setTimeout(function(){
				root.updateBox(root.dialog[root.lastDialog]);
			}, 1500);
		}
	}
	
	leave() {
		this.spanList.forEach(span => span.remove());
		this.spanList = [];
		
		this.DOMwrapper.style.opacity = 0;
		gameloop.currentHandler = this.location;
		menu.setMenu(this.lastMenu);
		this.whoYaGonnaCall(this.lastDialog, this.selectedAnswer);
	}
}

class quizClass {
	constructor() {
		this.DOMwrapper = document.getElementById('dialogBox');
		this.spanList = [];
		this.status = 'idle';
		this._selectedAnswer = 0;
	}
	
	start(questions, whoYaGonnaCall) {
		jukebox.playSong('quizMusic');
		
		this.whoYaGonnaCall = whoYaGonnaCall;
		this.questions = questions;
		
		// overtake menu and gamepad
		this.location = gameloop.currentHandler;
		this.lastMenu = menu.list;
		gameloop.currentHandler = this;
		
		this.currentQuestion = 0;
		this.correctAnswers = 0;
		this.wrongAnswers = 0;
		this.next();
	}
	
	set selectedAnswer(n) {
		const span = this.spanList[n];
		if (span && n>0) {
			this.spanList[this._selectedAnswer].classList.remove('selected');
			span.classList.add('selected');
			this._selectedAnswer = n;
		}
	}
	
	get selectedAnswer() {
		return this._selectedAnswer;
	}
	
	next() {
		const n = this.currentQuestion;
		
		// remove old stuff
		this.spanList.forEach(span => span.remove());
		this.spanList = [];
		
		// check what to show next
		if (n === 0) {
			this.showComment(this.questions.intro);
			this.status = 'comment';
		} else if (this.status === 'comment') {
			this.showQuestion(this.questions[`question${n}`]);
			this.status = 'question';
		} else if (this.status === 'question') {
			if (this.lastResult === 'correct') {
				this.showComment(this.questions[`correct${Math.min(3, n)}`]);
			} else {
				this.showComment(this.questions[`wrong${Math.min(3, n)}`]);
			}
			this.status = 'comment';
		} else if (this.status === 'final') {
			if (this.correctAnswers >= 8) {
				this.showComment(`You got ${this.correctAnswers} out of 10 correct! ${this.questions.win}`);
				this.quizWon = true;
			} else {
				this.showComment(`You only got ${this.correctAnswers} out of 10 correct! ${this.questions.loose}`);
				this.quizWon = false;
			}
		}
		this.DOMwrapper.style.opacity = 1;
		this.busy = false;
	}
	
	showQuestion(question) {
		// add question
		menu.setMenu({buttonArrows: 'pick your answer', buttonB: `it's final!'`});
		this.addSpan(question.text, `question ${this.questions.class}`);
		for (let i=1; i<10; i++) {
			const text = question[`answer${i}`];
			if (text) {
				this.addSpan(text, 'quizAnswers');
			} else {
				break;
			}
		}
		this.selectedAnswer = 1;
		this.status = 'choose';
	}
	
	showComment(comment) {
		menu.setMenu({buttonB: `continue`});
		this.addSpan(comment, `question ${this.questions.class}`);
	}
	
	addSpan(text, type) {
		const span = document.createElement('span');
		span.className = type;
		span.innerHTML = text;
		this.DOMwrapper.append(span);
		this.spanList.push(span);
	}
	
	keyPressed(changes) {
		const root = this;
		if (changes.B === 1 && this.status === 'comment' && !this.busy) {
			this.busy = true;
			this.currentQuestion++;
			if (this.currentQuestion > 10) {
				// quiz is over
				this.status = 'final';
			}
			this.DOMwrapper.style.opacity = 0;
			setTimeout(function(){
				root.next();
			}, 1500);
		} else if (changes.B === 1 && this.status === 'question' && !this.busy) {
			// check his answer
			const n = this.currentQuestion;
			const nCorrect = this.questions[`question${n}`].correct;
			if (this.selectedAnswer == nCorrect) {
				this.correctAnswers++;
				this.lastResult = 'correct';
				jukebox.playSound('correctAnswer');
			} else {
				this.wrongAnswers++;
				this.lastResult = 'wrong';
				jukebox.playSound('wrongAnswer');
			}
			this.DOMwrapper.style.opacity = 0;
			setTimeout(function(){
				root.next();
			}, 1500);
		} else if (changes.B === 1 && this.status === 'final' && !this.busy) {
			this.leave();
		} else if (changes.UpDown === -1 && this.status === 'question' && !this.busy) {
			// up
			this.selectedAnswer = this.selectedAnswer - 1;
		} else if (changes.UpDown === 1 && this.status === 'question' && !this.busy) {
			// down
			this.selectedAnswer = this.selectedAnswer + 1;
		}
	}
	
	leave() {
		this.spanList.forEach(span => span.remove());
		this.spanList = [];
		
		this.DOMwrapper.style.opacity = 0;
		gameloop.currentHandler = this.location;
		menu.setMenu(this.lastMenu);
		this.whoYaGonnaCall(this.quizWon, this.correctAnswers);
	}
}

class showMessageClass {
	constructor() {
		this.textDiv = document.getElementById('messageText');
		this.textDiv.innerHTML = 'This is a new message';
		this.cursor = true;
		this.hide();
		this.playAfter = 'none';
	}
	
	showMessage(textArray, className = 'none') {
		if (gameloop.currentHandler === this || gameloop.currentHandler === dialog) {
			// another message/dialog is showing right now... try again later
			const root = this;
			setTimeout(function(){
				root.showMessage(textArray, className);
			}, 10000);
			console.log('message: wait!');
		} else {
			this.className = className;
			this.lastLocation = gameloop.currentHandler;
			this.lastMenu = menu.list;
			gameloop.currentHandler = this;
			menu.setMenu({});
			this.messageComplete = false;
			this.textArray = textArray;
			this.index = 0;
			this.letter = 0;
			this.innerHTML = '';
			this.show();
			this.wait = false;
			this.timerCursor = setInterval(this.changeCursor.bind(this), 700);
			this.timerText = setInterval(this.addLetter.bind(this), 70);
			
			if (this.className !== 'none') {
				this.textDiv.classList.add(this.className);
			}
		}
	}
	
	changeCursor() {
		if (this.cursor) {
			this.textDiv.style.borderColor = 'transparent';
			this.cursor = false;
		} else {
			this.textDiv.style.borderColor = 'white';
			this.cursor = true;
		}
	}
	
	addLetter() {
		if (this.wait) {
			this.waitCounter++;
			if (this.waitCounter > 15) {
				this.wait = false;
				this.index++;
				this.letter = 0;
				if (this.index >= this.textArray.length) {
					clearInterval(this.timerText);
					this.messageComplete = true;
					menu.setMenu({buttonX: 'continue'});
				}
			}
		} else {
			this.innerHTML += this.textArray[this.index][this.letter];
			this.letter++;
			if (this.letter >= this.textArray[this.index].length) {
				this.wait = true;
				this.waitCounter = 0;
			}
		}
	}
	
	set innerHTML(value) {
		this._innerHTML = value;
		this.textDiv.innerHTML = value;
	}
	
	get innerHTML() {
		return this._innerHTML;
	}
	
	keyPressed(changes) {
		if (changes.X === 1 && this.messageComplete) {
			clearInterval(this.timerCursor);
			gameloop.currentHandler = this.lastLocation;
			menu.setMenu(this.lastMenu);
			this.hide();
			if (this.playAfter !== 'none') {
				jukebox.playSong(this.playAfter);
				this.playAfter = 'none';
			}
			if (this.className !== 'none') {
				this.textDiv.classList.remove(this.className);
			}
		}
	}
	
	hide() {
		document.getElementById('messageDisplay').style.visibility = 'hidden';
	}
	
	show() {
		document.getElementById('messageDisplay').style.visibility = 'visible';
	}
}

class gameScreenClass {
	constructor() {
		this.DOMbackground = document.getElementById('mainScreenBackground');
		this.DOMforeground = document.getElementById('mainScreenForeground');
		this.imageList = {};
	}
	
	loadImage(id, position = 'background') {
		let svg;
		if (this.imageList[id]) {
			svg = this.imageList[id];
		} else {
			svg = document.getElementById(id).contentDocument.children[0];
			svg.setAttribute('class', 'screenImage');
		}
		
		if (position === 'background') {
			this.DOMbackground.append(svg);
		} else if (position === 'foreground') {
			this.DOMforeground.append(svg);
		}
		this.imageList[id] = svg;

		return svg.getBoundingClientRect();
	}
	
	moveToBackground(id) {
		this.DOMbackground.append(this.imageList[id]);
	}
	
	moveToForeground(id) {
		if (this.DOMforeground.children[0]) {
			this.DOMforeground.children[0].before(this.imageList[id]);
		} else {
			this.DOMforeground.append(this.imageList[id]);
		}
		
	}

	hideAll(){
		this.DOMbackground.style.visibility = 'hidden';
		this.DOMforeground.style.visibility = 'hidden';
	}
	showAll(){
		this.DOMbackground.style.visibility = 'visible';
		this.DOMforeground.style.visibility = 'visible';
	}
	emtyAll() {
		for (let image in this.imageList){
			this.imageList[image].remove();
		}
		
	}
}

class inventoryClass {
	constructor() {
		this.inventory = document.getElementById('inventory');
		this.grid = document.getElementById('inventoryGrid');
		this.scrollBox = document.getElementById('inventorySroll');
		this.selector = document.getElementById('inventorySelector');
		this.animationContainer = document.getElementById('newItemAnimation');
		this.animationContainer.style.transform = 'scale(0.1)';
		this.animationContainer.style.opacity = '0';
		this.animationItem = document.getElementById('newItemTemp');
		this.itemList = {};
		this.scroll = 0;
		this.index = 0;
		this.gamesInInventory = 0;
		
		this.inInventory = {};
		
		// fill inventory with numbers for testing...
		/*
		for(let i=0; i<10; i++) {
			const temp = document.createElement('div');
			temp.setAttribute('class', 'item');
			temp.innerHTML = `item ${i}`;
			this.grid.append(temp);
			this.itemList[`id ${i}`] = temp;
		}
		*/
	}
	
	set gamesInInventory(value) {
		this._gamesInInventory = value;
		console.log(`# games in inventory: ${this.gamesInInventory}`);
	}
	
	get gamesInInventory() {
		return this._gamesInInventory;
	}
	
	enter() {
		this.location = gameloop.currentHandler;
		this.lastMenu = menu.list;
		gameloop.currentHandler = this;
		menu.setMenu({buttonArrows: 'move cursor', buttonB: 'select item'});
	}
	
	leave() {
		gameloop.currentHandler = this.location;
		menu.setMenu(this.lastMenu);
	}
	
	set index(i) {
		if (i > -1) {
			this._index = i;
			this.selectItem(i);
			this.selected = '';
			const image = this.grid.children[i];
			if (image) {
				// item slot is filled -> check for id
				for (let itemId in this.itemList) {
					if (this.itemList[itemId] === image) {
						this.selected = itemId;
					}
				}
			}
			
			// check if the selection reached the bottom or the top of the div
			const outer = this.inventory.getBoundingClientRect();
			const inner = this.selector.getBoundingClientRect();
			if (inner.bottom + inner.height > outer.bottom) {
				this.scroll = this.scroll - inner.bottom - inner.height + outer.bottom;
				this.scrollBox.style.top = `${this.scroll}px`;
			} else if (inner.top - inner.height < outer.top && i > 1) {
				this.scroll = this.scroll - inner.top + inner.height + outer.top;
				this.scrollBox.style.top = `${this.scroll}px`;
			}
		}
		console.log(`item selected: ${this.selected}`);
	}
	
	get index() {
		return this._index;
	}
	
	addItemSrc(src, id, type = 'game') {
		const image = document.createElement('img');
		image.setAttribute('src',src);
		image.id = id;
		this.itemList[id] = image;
		this.inInventory[id] = type;
		this.animationNewItem(image);
		this.gamesInInventory++;
	}
	
	addItem(id, type = 'item') {
		if (this.itemList[id]) {
			if (!this.inInventory[id]) {
				const image = this.itemList[id];
				this.grid.append(image);
				this.inInventory[id] = type;
				if (type === 'game') {
					this.gamesInInventory++;
				}
				this.index = this._index;
			}
		} else {
			const image = document.getElementById(id).contentDocument.children[0];
			this.itemList[id] = image;
			this.inInventory[id] = type;
			this.animationNewItem(image);
			if (type === 'game') {
				this.gamesInInventory++;
			}
		}
	}
	
	animationNewItem(image) {
		this.animationContainer.style.transform = 'scale(2)';
		this.animationContainer.style.opacity = '1';
		image.setAttribute('class', 'itemSlot');
		this.animationContainer.append(image);
		jukebox.playSound('getItem');
		
		const root = this;
		
		setTimeout(function(){
			root.animationContainer.style.transform = 'scale(0.1)';
			root.animationContainer.style.opacity = '0';
		}, 2500);
		
		setTimeout(function(){
			image.setAttribute('class', 'item');
			root.grid.append(image);
			root.index = root._index;
		}, 4000);
	}
	
	removeItem(id) {
		if (this.inInventory[id]) {
			if (this.inInventory[id] === 'game') {
				this.gamesInInventory--;
			}
			this.itemList[id].remove();
			delete this.inInventory[id];
			// if the removed item was the selected one, we have to update the selection...
			this.index = this._index;
		}
	}
	
	selectItem(index) {
		const col = index % 2;
		const row = Math.floor(index / 2 + 0.1);
		this.selector.style.top = `${row * 13.5}vw`;
		this.selector.style.left = `${col * 13.5}vw`;
	}
	
	keyPressed(changes) {
		if (changes.B === 1) {
			// leave inventory
			this.leave();
		} else if (changes.UpDown === -1) {
			// up
			this.index = this.index - 2;
		} else if (changes.UpDown === 1) {
			// down
			this.index = this.index + 2;
		} else if (changes.LeftRight === -1) {
			// left
			if (this.index % 2 === 1) {
				this.index = this.index - 1;
			}
		} else if (changes.LeftRight === 1) {
			// right
			if (this.index % 2 === 0) {
				this.index = this.index + 1;
			}
		}
	}
	
	checkForItem(id) {
		if (this.inInventory[id]) {
			return true;
		} else {
			return false;
		}
	}
}

class bottomMenuClass {
	constructor() {
		this.DOMwrapper = document.getElementById('bottomMenu');
		
		this.grid = document.getElementById('bottomMenuGrid');
		
		this.hidden = document.getElementById('hiddenButtons');
		this.buttonX = document.getElementById('buttonX');
		this.buttonY = document.getElementById('buttonY');
		this.buttonA = document.getElementById('buttonA');
		this.buttonB = document.getElementById('buttonB');
		this.buttonL = document.getElementById('buttonL');
		this.buttonR = document.getElementById('buttonR');
		this.buttonStart = document.getElementById('buttonStart');
		this.buttonSelect = document.getElementById('buttonSelect');
		this.buttonArrows = document.getElementById('buttonArrows');
		this.list = {};
		this.elementList = [];
	}
	
	setMenu(list) {
		this.list = list;
		
		// clear grid
		const len = this.elementList.length;
		for (let i=0; i<len; i++) {
			this.elementList[i].remove();
		}
		this.elementList = [];
		
		// fill grid with new instructions
		for (let key in list) {
			this.grid.append(this[key]);
			this.elementList.push(this[key]);
			let textDiv = document.createElement('div');
			textDiv.className = 'instructionText';
			textDiv.innerHTML = list[key];
			this.grid.append(textDiv);
			this.elementList.push(textDiv);
		}
	}
}

class avatarClass {
	constructor() {
		this.DOMwrapper = document.getElementById('avatarDiv');
		this.animationActive = false;
	}
	
	init() {
		this.avatarToRight = document.getElementById('Avatar_ToRight').contentDocument.children[0];
		this.avatarToLeft = document.getElementById('Avatar_ToLeft').contentDocument.children[0];
		this.avatarToBack = document.getElementById('Avatar_ToBack').contentDocument.children[0];
		this.avatarToFront = document.getElementById('Avatar_ToFront').contentDocument.children[0];
	}

	load(posX, posY, size) {
		this.posX = posX;
		this.posY = posY;
		this.size = size;
		this.currentAvatar = this.avatarToFront;
		console.log(`load`);
	}
	
	loadAbsolute(posX, posY, size) {
		const bbox = document.getElementById('mainScreenAvatar').getBoundingClientRect();
		this.posX = posX - bbox.left;
		this.posY = posY - bbox.top;
		this.size = size;
		this.currentAvatar = this.avatarToFront;
	}

	set currentAvatar(avatar) {
		if (this._currentAvatar) {
			this._currentAvatar.remove();
		}
		this._currentAvatar = avatar;
		this._currentAvatar.setAttributeNS(null, 'viewBox', `-150 0 150 300`);
		this.DOMwrapper.append(avatar);
	}

	get currentAvatar() {
		return this._currentAvatar;
	}

	startWalkingAnimation(direction) {
		console.log(`animate ${direction}`);
		if (this.animationActive) {
			this.stopWalkingAnimation();
		}
		
		if (direction === 'left') {
			this.currentAvatar = this.avatarToLeft;
		} else if (direction === 'right') {
			this.currentAvatar = this.avatarToRight;
		} else if (direction === 'back') {
			this.currentAvatar = this.avatarToBack;
		} else if (direction === 'front') {
			this.currentAvatar = this.avatarToFront;
		}
		
		this.animationActive = true;
		this.frameCounter = 0;
		this.timer = setInterval(this.animate.bind(this), 150);
	}
	
	animate() {
		const viewX = (this.frameCounter % 8) * 150;
		this.currentAvatar.setAttributeNS(null, 'viewBox', `${viewX} 0 150 300`);
		this.frameCounter++;
	}
	
	stopWalkingAnimation() {
		clearInterval(this.timer);
		this.currentAvatar.setAttributeNS(null, 'viewBox', `-150 0 150 300`);
		this.animationActive = false;
	}

	set size(value) {
		this.avatarToRight.setAttributeNS(null, 'height', `${value}px`);
		this.avatarToLeft.setAttributeNS(null, 'height', `${value}px`);
		this.avatarToFront.setAttributeNS(null, 'height', `${value}px`);
		this.avatarToBack.setAttributeNS(null, 'height', `${value}px`);
		this._size = value;
	}

	get size() {
		return this._size;
	}

	set posX(value) {
		this.DOMwrapper.style.left = `${value}px`;
		this._posX = value;
	}

	get posX() {
		return this._posX;
	}

	set posY(value) {
		this.DOMwrapper.style.top = `${value}px`;
		this._posY = value;
	}

	get posY() {
		return this._posY;
	}

	hide() {
		if (this._currentAvatar) {
			this._currentAvatar.remove();
		}
	}
	
	show() {
		if (this._currentAvatar) {
			this.DOMwrapper.append(this._currentAvatar);
		}
	}
}

class gamepadClass {
	constructor(index) {
		this.gamepadList = {};
		window.addEventListener("gamepadconnected", this.gamepadConnected.bind(this));
	}
	
	gamepadConnected(event) {
		const gamepad = event.gamepad;
		console.log(`gamepad ${gamepad.index} detected!`);
		this.gamepadList[gamepad.index] = gamepad;
	}
	
	checkGamepads() {
		this.anyChange = false;
		this.changes = {};
		const buttonMapping = {0: 'X', 1: 'A', 2: 'B', 3: 'Y', 4: 'L', 5: 'R', 8: 'Select', 9: 'Start'};
		const axesMapping = {0: 'LeftRight', 1: 'UpDown'};
		for (let index in this.gamepadList) {
			const currentStatus = navigator.getGamepads()[index];
			if (currentStatus == undefined) {
				// gamepad not found
				console.log(`gamepad ${index} not found!`);
				delete this.gamepadList[index];
			} else {
				// compare button status to previous status
				const len = currentStatus.buttons.length;
				for (let b=0; b<len; b++) {
					if (currentStatus.buttons[b].value !== this.gamepadList[index].buttons[b].value) {
						//console.log(`gamepad ${index}: button ${b} changed`);
						this.changes[buttonMapping[b]] = currentStatus.buttons[b].value;
						this.anyChange = true;
					}
				}

				// compare the d-pad positions
				for (let a=0; a<2; a++) {
					const difference = currentStatus.axes[a] - this.gamepadList[index].axes[a];
					if (difference > 0.1 || difference < -0.1) {
						//console.log(`gamepad ${index}: axis ${a} changed to ${Math.round(currentStatus.axes[a])}`);
						this.changes[axesMapping[a]] = Math.round(currentStatus.axes[a]);
						this.anyChange = true;
					}
				}
				
				this.gamepadList[index] = currentStatus;
			}
		}
		if (this.anyChange) {
		//	console.log(this.changes);
		}
	}
}

class timeStoriesClass {
	constructor() {
		this.walkStatus = 'intro';
	}
	
	enter() {
		gameloop.currentHandler = this;
		const bbox = gameScreen.loadImage('timeStories');
		this.bbox = {width: bbox.width, height: bbox.height, left: 0, right: bbox.width, top: 0, bottom: bbox.height};
		
		const size = 350 * this.bbox.height / 800;
		avatar.load(this.bbox.right, this.bbox.bottom - size - this.bbox.height / 800 * 150, size);
		avatar.startWalkingAnimation('left');
		this.timer = setInterval(this.animateIntro.bind(this), 150);
	}
	
	animateIntro() {
		avatar.posX = avatar.posX - 12;
		if (avatar.posX < this.bbox.width * 0.8) {
			this.stopMoving();
			this.walkStatus = 'idle';
			menu.setMenu({buttonX: 'use', buttonArrows: 'move'});
			avatar.currentAvatar = avatar.avatarToFront;
		}
	}
	
	stopMoving() {
		clearInterval(this.timer);
		avatar.stopWalkingAnimation();
		this.walkStatus = 'idle';
	}
	
	keyPressed(changes) {
		if (this.walkStatus !== 'intro') {
			this.updateMoveDirection(changes);
			if (changes.X === 1 && avatar.currentAvatar === avatar.avatarToBack) {
				const x = avatar.posX / this.bbox.width;
				if (x < 0.47 && x > 0.4) {
					this.leave();
				} else if (x < 0.22 && x > 0.15) {
					this.leave();
				}
			}
		}
	}
	
	leave() {
		console.log('using the pod');
		map.enter();
	}
	
	updateMoveDirection(changes) {
		if (changes.UpDown === -1 && this.walkStatus === 'idle') {
			avatar.currentAvatar = avatar.avatarToBack;
		} else if (changes.UpDown === 1 && this.walkStatus === 'idle') {
			avatar.currentAvatar = avatar.avatarToFront;
		} else if (changes.LeftRight === -1 && this.walkStatus !== 'left') {
			avatar.startWalkingAnimation('left');
			if (this.walkStatus === 'idle') {
				this.timer = setInterval(this.animateWalk.bind(this), 150);
			}
			this.walkStatus = 'left';
		} else if (changes.LeftRight === 1 && this.walkStatus !== 'right') {
			avatar.startWalkingAnimation('right');
			if (this.walkStatus === 'idle') {
				this.timer = setInterval(this.animateWalk.bind(this), 150);
			}
			this.walkStatus = 'right';
		} else if (changes.LeftRight == 0 && ['left', 'right'].indexOf(this.walkStatus) > -1) {
			this.stopMoving();
		}
	}
	
	animateWalk() {
		if (this.walkStatus === 'left') {
			const newX = avatar.posX - avatar.size / 20;
			avatar.posX = newX;
		} else if (this.walkStatus === 'right') {
			const newX = avatar.posX + avatar.size / 20;
			avatar.posX = newX;
		}
	}
}

class mapClass {
	constructor() {
		this.chosenLocation = 'playhouse';
		this.locations = {
			'map_fries': {up: 'map_lake', down: 'map_center', left: 'map_fries', right: 'map_fries', handler: mcDonalds},
			'map_ioannas': {up: 'map_ioannas', down: 'map_christos', left: 'map_center', right: 'map_ioannas', handler: ioannasFlat},
			'map_christos': {up: 'map_ioannas', down: 'map_christos', left: 'map_bus', right: 'map_christos', handler: christosFlat},
			'map_center': {up: 'map_fries', down: 'map_bus', left: 'map_playhouse', right: 'map_ioannas', handler: center},
			'map_bus': {up: 'map_center', down: 'map_bus', left: 'map_bus', right: 'map_christos', handler: busStop},
			'map_playhouse': {up: 'map_playhouse', down: 'map_playhouse', left: 'map_playhouse', right: 'map_center', handler: playhouse},
			'map_lake': {up: 'map_lake', down: 'map_fries', left: 'map_lake', right: 'map_lake', handler: lake}
		};
		this.firstTime = true;
	}
	
	enter() {
		const bbox = gameScreen.loadImage('map');
		gameloop.currentHandler = this;
		if (this.location) {
			this.changeLocation(this.location);
		} else {
			this.changeLocation('map_bus');
		}
		menu.setMenu({buttonArrows: 'select location', buttonB: 'enter'});
		jukebox.playSong('mapMusic');
		if (this.firstTime) {
			typewriter.showMessage(['You are in Giannena', ` - choose a location to start your adventure...`]);
			this.firstTime = false;
		}
	}
	
	changeLocation(id) {
		this.location = id;
		const image = document.getElementById(id);
		const bbox = image.getBoundingClientRect();
		avatar.loadAbsolute(bbox.left + bbox.width / 2 - 20, bbox.bottom - 100, 100);
	}
	
	keyPressed(changes) {
		for (let key in changes) {
			if (key === 'UpDown') {
				if (changes[key] === -1) {
					this.changeLocation(this.locations[this.location].up);
				} else if (changes[key] === 1) {
					this.changeLocation(this.locations[this.location].down);
				}
			} else if (key === 'LeftRight') {
				if (changes[key] === -1) {
					this.changeLocation(this.locations[this.location].left);
				} else if (changes[key] === 1) {
					this.changeLocation(this.locations[this.location].right);
				}
			} else if (key === 'B' && changes[key] === 1) {
				this.enterLocation();	
			}
		} 
	}
	
	enterLocation() {
		gameloop.currentHandler = this.locations[this.location].handler;
		gameloop.currentHandler.enter();
	}
}

class playhouseClass {
	constructor() {
		this.currentLocation = 'intro';
		this.walkStatus = 'idle';
		this.vaggelisStatus = 'none';
		this.wallGame = new playhouseWallGame();
		this.firstTime = true;
		this.dialogStatus = {mixed: 0, girls: 0, boys: 0, mixedGame: 'none', boysGame: 'none', girlsGame: 'none'};
		this.menu = {buttonX: 'talk', buttonArrows: 'move', buttonB: 'look closer', buttonSelect: 'inventory',
				buttonY: 'use item', buttonStart: 'back to map'};
	}
	
	enter() {
		gameloop.currentHandler = this;
		const bbox = gameScreen.loadImage('playhouse0');
		gameScreen.loadImage('playhouse1');
		gameScreen.loadImage('playhouse2');
		this.currentLayer = 0;
		this.bbox = {width: bbox.width, height: bbox.height, left: 0, right: bbox.width, top: 0, bottom: bbox.height};
		
		const size = 350 * this.bbox.height / 800;
		avatar.load(this.bbox.left - 150, this.bbox.bottom - size, size);
		avatar.startWalkingAnimation('right');
		this.timer = setInterval(this.animateIntro.bind(this), 150);
		this.walkStatus = 'animation';
		jukebox.stopMusic();
	}
	
	animateIntro() {
		avatar.posX = avatar.posX + 12;
		if (avatar.posX > this.bbox.width / 3) {
			this.stopMoving();
			this.currentLocation = 'downstairs';
			this.walkStatus = 'idle';
			menu.setMenu(this.menu);
			if (this.firstTime) {
				typewriter.showMessage(['Welcome back to the playhouse.', ` It's already 16:10`, ' and a Saturday.', ' Vaggelis was asking for you']);
				typewriter.playAfter = 'playhouseMusic';
				this.firstTime = false;
			} else {
				jukebox.playSong('playhouseMusic');
			}
		}
	}
	
	keyPressed(changes) {
		const x = avatar.posX / this.bbox.width;
		const y = avatar.posY / this.bbox.height;
		if (this.currentLocation === 'draw') {
			if (changes.A === 1 && !inventory.checkForItem('item_pencilcase')) {
				// take pencilcase
				inventory.addItem('item_pencilcase');
				document.getElementById('svg_pencilcase').remove();
				this.updateDrawMenu();
			} else if (changes.B === 1 && !inventory.checkForItem('item_notebook')) {
				// take notebook
				inventory.addItem('item_notebook');
				document.getElementById('svg_notebook').remove();
				this.updateDrawMenu();
			} else if (changes.Start === 1) {
				this.closeDraw();
			}
		} else if (changes.B === 1 && this.currentLocation === 'downstairs' && y < 0.35 && x > 0.42 && this.walkStatus === 'idle' && avatar.currentAvatar === avatar.avatarToRight) {
			// in the very back corner he can find his beloved choco
			inventory.addItem('item_choco');
		} else if (this.currentLocation === 'wall') {
			if (this.wallGame.hangmanActive){
				this.wallGame.keyPressedHangman(changes);
			} else{
				this.wallGame.keyPressed(changes);
			}
		} else if (this.currentLocation === 'downstairs' || this.currentLocation === 'upstairs') {
			this.updateMoveDirection(changes);
			// check if he is close to any customers
			let closeToGroup = 'none';
			if (x > 0.075 && x < 0.16 && y < 0.56 && this.walkStatus === 'idle' && avatar.currentAvatar === avatar.avatarToBack) {
				// mixed group below table
				closeToGroup = 'mixed';
			} else if (x > 0.1 && x < 0.28 && y < 0.5 && y > 0.4 && this.walkStatus === 'idle' && avatar.currentAvatar === avatar.avatarToFront) {
				// mixed group above table
				closeToGroup = 'mixed';
			} else if (x < 0.82 && y < 0.054 && y > 0.035 && this.walkStatus === 'idle' && avatar.currentAvatar === avatar.avatarToLeft) {
				// boys
				closeToGroup = 'boys';
			} else if (x < 0.33 && y < 0.015 && this.walkStatus === 'idle' && avatar.currentAvatar === avatar.avatarToBack) {
				// girls
				closeToGroup = 'girls';
			}
			
			if (changes.X === 1) {
				// talk!
				if (closeToGroup === 'mixed') {
					this.talkToMixedGroup();
				} else if (closeToGroup === 'girls') {
					this.talkToGirls();
				} else if (closeToGroup === 'boys') {
					this.talkToBoys();
				}
			} else if (changes.B === 1) {
				// look closer
				const x = avatar.posX / this.bbox.width;
				const y = avatar.posY / this.bbox.height;
				if (x > 0.45 && y > 0.39 && y < 0.46 && this.walkStatus === 'idle' && avatar.currentAvatar === avatar.avatarToRight) {
					// he is in front of the wall
					console.log('starting wall game...');
					this.currentLocation = 'wall';
					gameScreen.emtyAll();
					avatar.hide();
					this.wallGame.startGame();
				} else if (x > 0.71 && y > 0.55 && y < 0.575 && this.walkStatus === 'idle' && avatar.currentAvatar === avatar.avatarToRight) {
					// he is facing the red box
					this.openDraw();
				}
			} else if (changes.Start) {
				// to map
				this.leave();
			} else if (changes.Select) {
				// select item in inventory
				inventory.enter();
			} else if (changes.Y === 1) {
				if (closeToGroup !== 'none') {
					this.giveItemToGroup(closeToGroup);
				}
			}
		}
	}
	
	updateMoveDirection(changes) {
		if (changes.UpDown === -1 && this.walkStatus !== 'back') {
			avatar.startWalkingAnimation('back');
			if (this.walkStatus === 'idle') {
				this.timer = setInterval(this.animateWalk.bind(this), 150);
			}
			this.walkStatus = 'back';
		} else if (changes.UpDown === 1 && this.walkStatus !== 'front') {
			avatar.startWalkingAnimation('front');
			if (this.walkStatus === 'idle') {
				this.timer = setInterval(this.animateWalk.bind(this), 150);
			}
			this.walkStatus = 'front';
		} else if (changes.LeftRight === -1 && this.walkStatus !== 'left') {
			avatar.startWalkingAnimation('left');
			if (this.walkStatus === 'idle') {
				this.timer = setInterval(this.animateWalk.bind(this), 150);
			}
			this.walkStatus = 'left';
		} else if (changes.LeftRight === 1 && this.walkStatus !== 'right') {
			avatar.startWalkingAnimation('right');
			if (this.walkStatus === 'idle') {
				this.timer = setInterval(this.animateWalk.bind(this), 150);
			}
			this.walkStatus = 'right';
		} else if (changes.LeftRight == 0 && ['left', 'right'].indexOf(this.walkStatus) > -1) {
			this.stopMoving();
		} else if (changes.UpDown == 0 && ['back', 'front'].indexOf(this.walkStatus) > -1) {
			this.stopMoving();
		}
	}
	
	animateWalk() {
		if (this.walkStatus === 'left') {
			const newX = avatar.posX - avatar.size / 20;
			if (!this.checkCollision(newX, avatar.posY)) {
				avatar.posX = newX;
			}
		} else if (this.walkStatus === 'right') {
			const newX = avatar.posX + avatar.size / 20;
			if (!this.checkCollision(newX, avatar.posY)) {
				avatar.posX = newX;
			}
		} else if (this.walkStatus === 'back') {
			let newY = avatar.posY - avatar.size / 40;
			let newX = avatar.posX - avatar.size / 30;
			if (this.currentLocation === 'upstairs') {
				newX = avatar.posX - avatar.size / 20;
				newY = avatar.posY - avatar.size / 60;
			}
			const newSize = avatar.size * 0.98;
			if (!this.checkCollision(newX, newY)) {
				avatar.posY = newY;
				avatar.posX = newX;
				avatar.size = newSize;
			}
		}  else if (this.walkStatus === 'front') {
			let newY = avatar.posY + avatar.size / 40;
			let newX = avatar.posX + avatar.size / 30;
			if (this.currentLocation === 'upstairs') {
				newX = avatar.posX + avatar.size / 20;
				newY = avatar.posY + avatar.size / 60;
			}
			const newSize = avatar.size / 0.98;
			if (!this.checkCollision(newX, newY)) {
				avatar.posY = newY;
				avatar.posX = newX;
				avatar.size = newSize;
			}
		}
		this.checkLayers();
	}
	
	checkLayers() {
		const x = avatar.posX / this.bbox.width;
		const y = avatar.posY / this.bbox.height;
		if (this.currentLocation === 'downstairs') {
			// update the playhouse layers depending on avatars y position
			if (y < 0.5 && this.currentLayer === 0) {
				gameScreen.moveToForeground('playhouse2');
				this.currentLayer = 1;
			} else if (y > 0.5 && this.currentLayer === 1) {
				gameScreen.moveToBackground('playhouse2');
				this.currentLayer = 0;
			} else if (y < 0.38 && this.currentLayer === 1) {
				gameScreen.moveToForeground('playhouse1');
				this.currentLayer = 2;
			} else if (y > 0.38 && this.currentLayer === 2) {
				gameScreen.moveToBackground('playhouse1');
				this.currentLayer = 1;
			}
		}
	}
	
	checkCollision(newX, newY) {
		const x = newX / this.bbox.width;
		const y = newY / this.bbox.height;
		if (this.currentLocation === 'downstairs') {
			// check that the avatar is not colliding with furniture
			const xCenter = 0.58 - (0.5546 - y) * 16 / 15;
			if (y > 0.7) {
				// bottom of screen
				this.stopMoving();
				return true;
			} else if (y > 0.58) {
				// bottom of screen <-> bottom of red box
				// here we might reach the stairs
				if (x > 1) {
					this.goUpstairs();
					return true;
				} else if (x < -0.1) {
					this.stopMoving();
					return true;
				}
			} else if (y > 0.53) {
				// bottom of red box <-> bottom of big table
				if (x < -0.1) {
					this.stopMoving();
					return true;
				} else if (x > 0.75) {
					this.stopMoving();
					return true;
				}
			} else if (y > 0.47) {
				// bottom of big table <-> top of big table
				if (xCenter - x > 0.05) {
					this.stopMoving();
					return true;
				} else if (x - xCenter > 0.15) {
					this.stopMoving();
					return true;
				}					
			} else if (y > 0.41) {
				// top of big table <-> bottom of blue table
				if (x < 0) {
					this.stopMoving();
					return true;
				} else if (x - xCenter > 0.05) {
					this.stopMoving();
					return true;
				}
			} else if (y > 0.35) {
				// bottom of blue table <-> top of blue table
				if (Math.abs(x - xCenter) > 0.05) {
					this.stopMoving();
					return true;
				}
			} else if (y > 0.325) {
				// top of blue table <-> back wall
				if (x < 0.2 || x > 0.44) {
					this.stopMoving();
					return true;
				}
			} else {
				// back wall
				this.stopMoving();
				return true;
			}
		} else if (this.currentLocation === 'upstairs') {
			if (x < 0.17) {
				this.stopMoving();
				return true;
			} else if (y < 0.0028) {
				this.stopMoving();
				return true;
			} else if (y > 0.016) {
				const xBorder = 0.97 - (0.12 - y) * 12 / 5;
				if (x < xBorder) {
					this.stopMoving();
					return true;
				}
			}
			if (x > 1.05) {
				this.goDownstairs();
				return true;
			}
		}
		return false;
	}
	
	goUpstairs() {
		console.log('go up');
		// stop current walking animation
		this.stopMoving();
		this.posDownstairs = {size: avatar.size, posX: avatar.posX, posY: avatar.posY};
		console.log(this.posDownstairs);
		
		// make the avatar appear upstairs
		this.currentLocation = 'goUp';
		this.walkStatus = 'animation';
		avatar.posX = this.bbox.right;
		avatar.posY = this.bbox.height / 6;
		avatar.size = 350 * this.bbox.height / 800
		avatar.startWalkingAnimation('back');
		this.timer = setInterval(this.animateStairs.bind(this), 150);
		
		// set layers
		this.currentLayer === 0;
		gameScreen.moveToForeground('playhouse2');
		gameScreen.moveToForeground('playhouse1');
	}
	
	goDownstairs() {
		console.log('go down');
		// stop current walking animation
		this.stopMoving();
		
		// make the avatar appear upstairs
		this.currentLocation = 'goDown';
		this.walkStatus = 'animation';
		avatar.posX = this.posDownstairs.posX;
		avatar.posY = this.posDownstairs.posY;
		avatar.size = this.posDownstairs.size;
		avatar.startWalkingAnimation('left');
		this.timer = setInterval(this.animateStairs.bind(this), 150);
		
		// set layers
		this.currentLayer === 2;
		gameScreen.moveToBackground('playhouse1');
		gameScreen.moveToBackground('playhouse2');
	}
	
	animateStairs() {
		if (this.currentLocation === 'goUp') {
			avatar.posY = avatar.posY - avatar.size / 40;
			avatar.posX = avatar.posX - avatar.size / 30;
			avatar.size = avatar.size * 0.98;
			if (avatar.posY < this.bbox.height / 25) {
				this.stopMoving();
				this.currentLocation = 'upstairs';
				this.walkStatus = 'idle';
			}
		} else if (this.currentLocation === 'goDown') {
			avatar.posX = avatar.posX - avatar.size / 20;
			if (avatar.posX < this.bbox.width * 3 / 4) {
				this.stopMoving();
				this.currentLocation = 'downstairs';
				this.walkStatus = 'idle';
			}
		}
	}
	
	stopMoving() {
		clearInterval(this.timer);
		avatar.stopWalkingAnimation();
		this.walkStatus = 'idle';
	}
	
	leaveWall() {
		this.currentLocation = 'downstairs';
		gameScreen.emtyAll();
		avatar.show();
		this.showAllLayers();
		menu.setMenu(this.menu);
		jukebox.playSong('playhouseMusic');
	}
	
	openDraw() {
		avatar.hide();
		this.currentLocation = 'draw';
		gameScreen.emtyAll();
		gameScreen.loadImage('playhouseDraw');
		this.updateDrawMenu();
	}
	
	updateDrawMenu() {
		if (inventory.checkForItem('item_pencilcase') && inventory.checkForItem('item_notebook')) {
			menu.setMenu({buttonStart: 'go back'});
		} else if (inventory.checkForItem('item_pencilcase')) {
			menu.setMenu({buttonA: 'take blockaki', buttonStart: 'go back'});
		} else if (inventory.checkForItem('item_notebook')) {
			menu.setMenu({buttonA: 'take pencilcase', buttonStart: 'go back'});
		} else {
			menu.setMenu({buttonB: 'take pencilcase', buttonA: 'take blockaki', buttonStart: 'go back'});
		}
	}
	
	closeDraw() {
		avatar.show();
		this.currentLocation = 'downstairs';
		gameScreen.emtyAll();
		this.showAllLayers();
		menu.setMenu(this.menu);
	}
	
	showAllLayers() {
		const y = avatar.posY / this.bbox.height;
		
		gameScreen.loadImage('playhouse0');
		if (this.currentLocation === 'upstairs' || y < 0.38) {
			gameScreen.loadImage('playhouse1', 'foreground');
		} else {
			gameScreen.loadImage('playhouse1')
		}
		if (this.currentLocation === 'upstairs' || y < 0.5) {
			gameScreen.loadImage('playhouse2', 'foreground');
		} else {
			gameScreen.loadImage('playhouse2')
		}
		
	}
	
	talkToMixedGroup() {
	    const dialog0 = {
	        // he first presses the "hello" button:
	        class: 'playhouse',
	        start:{ text: "Hello, how are you?", answer1:['I am fine guys, and you?','dialog2'], answer2:['Great! Do you guys want to play something?', 'dialog3']},
	        dialog2:{ text:"Fine! We came for a coffee. The exam period starts tomorrow omg",  answer1:['Ah right! Anyway, do you want to play?','dialog3'], answer2:['Mmmm good luck (xestika). If you want to play let me know.','end']},
	        dialog3: {text:'We do. What can we play?', answer1:['The games are devided in categories. The categories are strategy, luck, logic, speed, dexterity, mystery, thinking, observation etc.','dialog4']},
	        dialog4: {text:'Mmm wow so many!', answer1:['Καλα που μας το ειπες','end'], answer2:['Sure. So would you like to play?','dialog5'], answer3:['Yes indeed! What do you fancy?','dialog5']},
	        // final discussion. Have to give "set" or "robotakia".
	        dialog5:{text:'Yes yes! We want something with logic and thinking.', answer1:['Oh cool, I have it right here','end'], answer2:['Alright, I will be right back','end']}
	    }
    

	    // mixed group -- Second dialog (in case he ended the first conversation at dialog2)
	    const dialog1 = {
	        // he first presses the "hello" button:
	        class: 'playhouse',
	        start:{ text: "Hey Christo, we decided we would like to play something.", answer1:['Ok, do you know what kind of game you want?','dialog2'], answer2:['Cool, let me explain:  The categories are strategy, luck, logic, speed, dexterity, mystery, thinking, observation etc.', 'dialog3']},
	        dialog2:{ text:"No...can you suggest something please?",  answer1:['Yes, that is my job!?','dialog4'], answer2:['Sure guys! Just tell me if you feel like playing sth with speed, or strategy or whatever and I will figure sth out.','dialog4']},
	        dialog3: {text:'We would like a game with logic and thinking.', answer1:['Oh cool, I have one right here','end'], answer2:['Ok cool, I will be right back','end']},
	        dialog4:{text:'Thanks! Which game do you have for us?'}
	    }

	    // mixed group -- third dialog (in case he ended the first conversation at dialog3)
	    const dialog2 = {
	        class: 'playhouse',
	        start:{ text: "Hey Christo, we decided we would like to play something.", answer1:['Ok, what do you feel like playing?','dialog2']}, 
	        dialog2: {text:'We would like a game with logic and thinking.', answer1:['Alright, I have a nice one right here','end'], answer2:['Ok cool, I will be right back','end']},
	        dialog3:{text:'Thanks!'}
	    }
    
	    const dialog3 = {
	        class: 'playhouse',
	        start:{ text: "Can we please get another game? We do not like this one.", answer1:['Alright, I have a nice one right here','end'], answer2:['Ok I will be right back','end'], answer3:['What do you wanna play?','dialog2']},
			 dialog2: {text:'We already told you: we would like a game with logic and thinking.'}
	    }
		 
	    const dialog10 = {
	        class: 'playhouse',
	        start:{ text: "We already told you what we are looking for. Just bring us a game!"}
	    }

	    const dialog60 = {
	        class: 'playhouse',
	        start:{ text: "Yes?", answer1:['How is it going over here guys?','dialog2'], answer2:['Do you like the game?','dialog2']},
	        dialog2: {text: `We are still playing ${this.dialogStatus.mixedGame}. It's a bit boring but now that we started we wanna at least play one round! Maybe it will grow on us after all.`}
	    }
		 
	    const dialog69 = {
	        class: 'playhouse',
	        start:{ text: "Yes?", answer1:['How is it going over here guys?','dialog2'], answer2:['Do you like the game?','dialog2']},
	        dialog2: {text: 'Thanks for the great game. This is exactly what we were looking for! You wanna play with us?', answer1:[`I'm glad that you like it but I don't have time to play right now.`, 'end'],  answer2:[`Sure, as if I have nothing better to do (sarcastic)`, 'end']}
	    }
		 
		 // 60 = dont like game but dont wanna change yet...
		 // 3  = dont like game and ready to change...
		 // 69 = like game and will keep playing...
		 
	    if (this.dialogStatus.mixed === 0) {
	        dialog.startDialog(dialog0, this.talkToMixedEnded.bind(this));
	    } else if (this.dialogStatus.mixed === 1) {
	        dialog.startDialog(dialog1, this.talkToMixedEnded.bind(this));
	    } else if (this.dialogStatus.mixed === 2) {
	        dialog.startDialog(dialog2, this.talkToMixedEnded.bind(this));
	    } else if (this.dialogStatus.mixed === 3) {
	        dialog.startDialog(dialog3, this.talkToMixedEnded.bind(this));
	    } else if (this.dialogStatus.mixed === 10) {
	        dialog.startDialog(dialog10, this.talkToMixedEnded.bind(this));
	    } else if (this.dialogStatus.mixed === 60) {
	        dialog.startDialog(dialog60, this.talkToMixedEnded.bind(this));
	    } else if (this.dialogStatus.mixed === 69) {
	        dialog.startDialog(dialog69, this.talkToMixedEnded.bind(this));
	    }
	}
	
	talkToMixedEnded(dialog, answer) {
    
	    console.log(`mixed group ended on ${dialog} with answer ${answer}`);
    
	    const root = this;
    
	    if (this.dialogStatus.mixed === 0) {
        
	        if (dialog === 'dialog2') {
				  this.dialogStatus.mixed = -1;
				  setTimeout(function() {
					  root.checkOnGroup(0);
				  }, 80000);
	        } else if (dialog === 'dialog4') {
				  this.dialogStatus.mixed = -1;
				  setTimeout(function() {
					  root.checkOnGroup(1);
				  }, 90000);
	        } else if (dialog === 'dialog5') {
	            this.dialogStatus.mixed = 10;
	            // Here give the game
	        }
	    } else if (this.dialogStatus.mixed === 1) {
	        this.dialogStatus.mixed = 10;
	    } else if (this.dialogStatus.mixed === 2) {
	        this.dialogStatus.mixed = 10;
	    } else if (this.dialogStatus.mixed === 3) {
	        this.dialogStatus.mixed = 10;
			  inventory.addItem(this.dialogStatus.mixedGame, 'game');
			  this.dialogStatus.mixedGame = 'none';
	    }
	}
	
	checkOnGroup(eventNo) {
		if (gameloop.currentHandler !== this) {
			const root = this;
			setTimeout(function() {
				console.log('delay check on group!');
				root.checkOnGroup(eventNo);
			}, 15000);
		} else if (eventNo === 0) {
		    if (this.currentLocation !== 'gone') {
		        typewriter.showMessage(['CHRIIIISTOOOO!?', ` Σε ζητανε στο πρασινο!`]);
		    }
		    this.dialogStatus.mixed = 1;
		} else if (eventNo === 1) {
		    if (this.currentLocation !== 'gone') {
		        typewriter.showMessage(['CHRIIIISTOOOO!?', ` Σε ζητανε στο πρασινο!`]);
		    }
		    this.dialogStatus.mixed = 2;
		} else if (eventNo === 2) {
		    if (this.currentLocation !== 'gone') {
		        typewriter.showMessage(['Green table: What a boring game...', ` Can we change game over here?`]);
		    }
		    this.dialogStatus.mixed = 3;
		} else if (eventNo === 10) {
		    if (this.currentLocation !== 'gone') {
		        typewriter.showMessage(['CHRIIIISTOOOO!?', ` Σε ζητανε στη βιτρινα 5!`]);
		    }
		    this.dialogStatus.boys = 1;
		} else if (eventNo === 11) {
		    if (this.currentLocation !== 'gone') {
		        typewriter.showMessage(['Vitrina5: Do you get this game? ', ` Me neither, lets change it...`]);
		    }
		    this.dialogStatus.boys = 2;
		} else if (eventNo === 101) {
		    if (this.currentLocation !== 'gone') {
		        typewriter.showMessage(['Separe: This is not really what we asked for. ', `Lets get another one?`]);
		    }
		    this.dialogStatus.girls = 2;
		} else if (eventNo === 666) {
			const dialog0 = {
			    class: 'vaggelis',
			    start:{ text: "Hey Christo, can you come over here for a minute?", answer1:['Sure, what do you want?','dialog2'], answer2:['Dont you have some Tichu to play?', 'dialog3'],  answer3:[ 'I cant I am busy', 'end']},
			    dialog2:{ text:"We should make next weeks schedule",  answer1:['Ok','dialog4'], answer2:['Yes Vaggeli, like we make it every weekend.','dialog4']},
			    dialog3: {text:'Yes of course, but now we are waiting for the fourth one. Can we discuss the schedule?', answer1:['No.', 'end'], answer2:['Yes ok, lets make the schedule ', 'dialog4']},
			    dialog4: {text: 'You need to take more shifts this week.', answer1:['No. Anything else?', 'dialog5'], answer2: ['I dont need to do anything Vaggeli', 'dialog5'], answer3: ['Ask Panos to take more','dialog7']},
			    dialog5:{text: 'Why not? Do you have something to do?', answer1:['Yes Vaggeli you know I have a scholi to attend I am not sleeping standing','dialog6'], answer2:['I said I cant, find someone else','dialog6'], answer3:['None of your business. I will work what we agreed and no more','dialog6']},
			    dialog6: {text: 'You will never understand what a schedule means! POOOOOOTTTTEEEEEEEEEEEE', answer1: ['Ok whatever, my shift ends soon. Pay me before your Tichu starts','dialog8']},
			    dialog7: {text: 'Panos is busy, he has to organise a DAP-NDFK party. So can you take some more?', answer1: ['I said no.','dialog6'], answer2: ['Sorry, no I cant','dialog6'], answer3: ['Oh damn, what a pitty, I have plans (ironically)','dialog6']},
			    dialog8: {text: 'Right, my Tichu is about to begin YUPI! Here is your money and nobody disrupts me until the game is over!'}
			}
			const root = this;
			dialog.startDialog(dialog0, this.vaggelisEnd.bind(this));
		} else if (eventNo === 667) {
			const dialog0 = {
			    class: 'vaggelis',
			    start:{ text: "Hey, can we make the schedule now?", answer1:['Yes alright lets do it','dialog2']},
			    dialog2: {text: 'You need to take more shifts this week.', answer1:['No. Anything else?', 'dialog3'], answer2: ['I dont need to do anything Vaggeli', 'dialog3'], answer3: ['Ask Panos to take more','dialog5']},
			    dialog3:{text: 'Why not? Do you have something to do?', answer1:['Yes Vaggeli you know I have a scholi to attend I am not sleeping standing','dialog4'], answer2:['I said I cant, find someone else','dialog4'], answer3:['None of your business. I will work what we agreed and no more','dialog4']},
			    dialog4: {text: 'You will never understand what a schedule means! POOOOOOTTTTEEEEEEEEEEEE', answer1: ['Ok whatever, my shift ends soon. Pay me before your next Tichu starts','dialog6']},
			    dialog5: {text: 'Panos is busy, he has to organise a DAP-NDFK party. So can you take some more?', answer1: ['I said no.','dialog4'], answer2: ['Sorry, no I cant','dialog4'], answer3: ['Oh damn, what a pitty, I have plans (ironically)','dialog4']},
			    dialog6: {text: 'Right, my Tichu is about to begin YUPI! Here is your money and nobody disrupts me until the game is over!'}
			}
			const root = this;
			dialog.startDialog(dialog0, this.vaggelisEnd2.bind(this));
		}
	}
	
	vaggelisEnd(dialog, answer) {
		const root = this;
		if (dialog === 'start' || dialog === 'dialog3') {
			setTimeout(function(){
				root.checkOnGroup(667);
			}, 10000);
		} else {
			inventory.addItem('item_money');
		}
	}
	
	vaggelisEnd2(dialog, answer) {
		inventory.addItem('item_money');
	}
	
	talkToBoys() {
	    // boys -- First dialog
	    const dialog0 = {
	        class: 'playhouse',
	        start: {text: 'Hey there, can we play something?', answer1:['Yes, do you have something in mind?', 'dialog2'], answer2:['Sure, you came to the right place for that!','dialog3']},
	        dialog2: {text: 'Yes yes, our friend told us about this game...how was it called re? Ah yes, Catan! We want to play Catan!', answer1: ['Hmmm ok ok. Eeee unfortunatelly Catan is for 3 or 4 players only, οχι ρε γαμωτο. There is a very nice one with fruits, do you want to try it?', 'dialog4'], answer2: ['Ah what a pitty, some other group is playing. Do you want something else?', 'dialog5'], answer3: ['Δεν κοιτας τα μουτρα σου μου θες και καταν','end']},
	        dialog3: {text: 'Ook, we want something funny, strategic, mystery and with luck.', answer1: ['Yeah ok aha, I will go figure (sassy)', 'end'], answer2: ['Why wouldnt you? Maybe I should bring you MY favourite? Yeah? Ok, bye', 'end'], answer3: ['Ahha, you are clearly confused. When you make up your mind let me know, yeah? (also sassy)', 'end']},
	        dialog4: {text: 'Ah you mean Halli Galli, no no we are bored of it. But yes ok, something similar? Or dexterity! We are very dexterious!', answer1:['Good for you. I have it right here.','end'], answer2:['Ok, I will be right back','end']},
	        // correct games: ligretto, villa paletti, make and break
	        dialog5: {text: 'Πωωω τι γκαντεμια! Pitty. E its ok, next time. Yes sure, bring another one. One with speed or dexterity!', answer1: ['Next time make sure you ask for Ioanna to explain Catan. But for now I have a nice game here.', 'end'], answer2:['Ok, I will bring something soon.','end']}
	    }
	    // boys -- second dialog
	    const dialog1 = {
	        class: 'playhouse',
	        start: {text: 'Hey dude, can you bring us a game?', answer1:['Sure I can, did you decide what type of game you want?', 'dialog2'], answer2:['Yes, how about one with nice big pieces?','dialog2']},
	        dialog2: {text: 'Ee want to try one with speed or dexterity.', answer1: ['Ok. Maybe Halli Galli...', 'dialog3'], answer2: ['Good I see you finally came to your senses. I think you would enjoy Halli Galli!', 'dialog3']},
	        dialog3: {text: 'No! Not Halli Galli. We want another one. One with speed or dexterity!', answer1: ['Ok fine, I have another one, here with me.', 'end'], answer2: ['Alright then, I will take a look and come back', 'end']},
	        // correct games: ligretto, villa paletti, make and break
	    }
		 
		 // ready to play
	    const dialog10 = {
	        class: 'playhouse',
	        start:{ text: "We already told you what we are looking for. Just bring us a game!"}
	    }
		 
	    const dialog60 = {
	        class: 'playhouse',
	        start:{ text: "Yes?", answer1:['How is it going over here guys?','dialog2'], answer2:['Do you like the game?','dialog2']},
	        dialog2: {text: `We are still playing ${this.dialogStatus.boysGame}. It's a bit boring but now that we started we wanna at least play one round! Maybe it will grow on us after all.`}
	    }
		 
	    const dialog69 = {
	        class: 'playhouse',
	        start:{ text: "Yes?", answer1:['How is it going over here guys?','dialog2'], answer2:['Do you like the game?','dialog2']},
	        dialog2: {text: 'Thanks, yes. We totally understand this one, awesome!', answer1:[`What a surprise`, 'end'],  answer2:[`A so you DO know colors...well done (super sassy)`, 'end']}
	    }

	    const dialog2 = {
	        class: 'playhouse',
	        start: {text: 'Excuse me Mister? Over here! Can we get an easier game?', answer1:['Maybe try this one over here', 'end'], answer2:['Ok fine, I will be right back','end']}
	    }
    
	    if (this.dialogStatus.boys === 0) {
	        dialog.startDialog(dialog0, this.talkToBoysEnded.bind(this));
	    } else if (this.dialogStatus.boys === 1) {
	        dialog.startDialog(dialog1, this.talkToBoysEnded.bind(this));
	    } else if (this.dialogStatus.boys === 2) {
	        dialog.startDialog(dialog2, this.talkToBoysEnded.bind(this));
	    } else if (this.dialogStatus.boys === 10) {
	        dialog.startDialog(dialog10, this.talkToBoysEnded.bind(this));
	    } else if (this.dialogStatus.boys === 60) {
	        dialog.startDialog(dialog60, this.talkToBoysEnded.bind(this));
	    } else if (this.dialogStatus.boys === 69) {
	        dialog.startDialog(dialog69, this.talkToBoysEnded.bind(this));
	    } else if (this.dialogStatus.boys === 3) {
	        dialog.startDialog(dialog3, this.talkToBoysEnded.bind(this));
	    }
	}
	
	talkToBoysEnded(dialog, answer) {
	    console.log(`boys ended on ${dialog} with answer ${answer}`);
	    const root = this;
	    if (this.dialogStatus.boys === 0) {
	        if (dialog === 'dialog4' || dialog === 'dialog5') {
	            this.dialogStatus.boys = 10;
	        } else {
	            this.dialogStatus.boys = -1;
	            setTimeout(function(){
	                root.checkOnGroup(10);
	            }, 60000);
	        }
	    } else if  (this.dialogStatus.boys === 1) {
	        if (dialog === 'dialog3') {
	            this.dialogStatus.boys = 10;
	        }
	    } else if  (this.dialogStatus.boys === 2) {
	        this.dialogStatus.boys = 10;
			  inventory.addItem(this.dialogStatus.boysGame, 'game');
			  this.dialogStatus.boysGame = 'none';
	    }
	}
	
	talkToGirls() {
	    // girls -- First dialog
	    const dialog0 = {
	        class: 'playhouse',
	        start: {text: 'Hey Christo, how are you? (giggles)', answer1:['All good, and you?','dialog2'], answer2:['Ah hi there', 'dialog3']},
	        dialog2: {text: 'I am fine! Do you remember me??', answer1:['No, who the hell are you?','dialog4'], answer2:['No, why should I?','dialog4']},
	        dialog3: {text: 'You dont remember me, do you? (getting upset)', answer1:['Of course not, who the hell are you?', 'dialog4'], answer2:['Of course not.why should I?','dialog4']},
	        dialog4: {text: 'Whatever, can you bring us a game? (clearly annoyed)', answer1:['Sure, what would you like to play?','dialog5'], answer2:['Ok, would you like something with observation? It is nice','dialog6']},
	        // correct games: kaleidos, kahuna, yinsh, zertz
	        dialog5: {text: 'Bring a strategic game or with observation.', answer1:['Alright, I have it right here','end'], answer2:['Ok cool, I will be right back','end']},
	        dialog6: {text: 'Mm ok, or some strategic game if you can suggest one.', answer1:['Oh cool, I have some right here','end'], answer2:['Ok, I will be right back','end']},
	    }

	     const dialog2 = {
	        class: 'playhouse',
	        start: {text: 'Hi again, can we have another game please? We did not like this one.', answer1:['Of course, how about this one right here?','end'], answer2:['Ok, I have another one in mind. I will be right back', 'end']},
	     }
		  
 	    const dialog10 = {
 	        class: 'playhouse',
 	        start:{ text: "We already told you what we are looking for. Just bring us a game!"}
 	    }
		 
 	    const dialog60 = {
 	        class: 'playhouse',
 	        start:{ text: "Yes?", answer1:['How is it going over here guys?','dialog2'], answer2:['Do you like the game?','dialog2']},
 	        dialog2: {text: `We are still playing ${this.dialogStatus.girlsGame}. It's a bit boring but now that we started we wanna at least play one round! Maybe it will grow on us after all.`}
 	    }
		 
 	    const dialog69 = {
 	        class: 'playhouse',
 	        start:{ text: "Yes?", answer1:['How is it going over here guys?','dialog2'], answer2:['Do you like the game?','dialog2']},
 	        dialog2: {text: 'This is a nice game, thanks!', answer1:[`I'm glad that you like it!`, 'end'],  answer2:[`There are more games like these. Next time you can try a new one!`, 'end']}
 	    }
    
	    if (this.dialogStatus.girls === 0) {
	        dialog.startDialog(dialog0, this.talkToGirlsEnded.bind(this));
	    } else if (this.dialogStatus.girls === 1) {
	        dialog.startDialog(dialog1, this.talkToGirlsEnded.bind(this));
	    } else if (this.dialogStatus.girls === 10) {
	        dialog.startDialog(dialog10, this.talkToGirlsEnded.bind(this));
	    } else if (this.dialogStatus.girls === 60) {
	        dialog.startDialog(dialog60, this.talkToGirlsEnded.bind(this));
	    } else if (this.dialogStatus.girls === 69) {
	        dialog.startDialog(dialog69, this.talkToGirlsEnded.bind(this));
	    } else if (this.dialogStatus.girls === 2) {
	        dialog.startDialog(dialog2, this.talkToGirlsEnded.bind(this));
	    }
	}
	
	talkToGirlsEnded(dialog, answer) {
	    console.log(`girls ended on ${dialog} with answer ${answer}`);
	    if (this.dialogStatus.girls === 0) {
	    	this.dialogStatus.girls = 10;
	    } else if (this.dialogStatus.girls === 2) {
	    	this.dialogStatus.girls = 10;
		  inventory.addItem(this.dialogStatus.girlsGame, 'game');
		  this.dialogStatus.girlsGame = 'none';
	    }
	    
	}
	
	giveItemToGroup(group) {
		console.log(`trying to give ${inventory.selected} to ${group}`);
		
		const delay = 120000;
		
		const root = this;
		const chosenGame = inventory.selected;
		const acceptableMixed = ['set','robotakia'];
		const acceptableBoys = ['ligretto', 'villa paletti', 'make and break'];
		const acceptableGirls = ['kaleidos', 'kahuna', 'yinsh', 'zertz'];
		
		const dialog0 = {
			class: 'christo',
			start: {text: `Here you go, you will play ${inventory.selected} today. Enjoy!`}
		}
		
		const dialogNotAGame = {
			class: 'playhouse',
			start: {text: `What the fuck is this? We were asking for a game not a ${inventory.selected.split('_')[1]}!`}
		}
		
		const dialogStillPlaying = {
			class: 'playhouse',
			start: {text: `We already have a game! Or is this an extension for this game?`, answer1: ['No it is not. But if you wanna give this game a try, let me know!', 'end']}
		}

		if (this.dialogStatus.mixed === 10 && group === 'mixed') {
			if (inventory.inInventory[chosenGame] !== 'game') {
				dialog.startDialog(dialogNotAGame, this.nothing.bind(this));
			} else if (this.dialogStatus.mixedGame !== 'none') {
				dialog.startDialog(dialogStillPlaying, this.nothing.bind(this));
			} else {
				dialog.startDialog(dialog0, this.nothing.bind(this));
				this.dialogStatus.mixedGame = chosenGame;
				inventory.removeItem(chosenGame);
  		   	// They have a game
  		   	//check if it is the correct one
  		   	if (acceptableMixed.indexOf(chosenGame) > -1) {
  					 this.dialogStatus.mixed = 69;
  				} else {
  		   	  this.dialogStatus.mixed = 60;
  					setTimeout(function(){
  						root.checkOnGroup(2);
  					}, delay);
  				}
			}
		} else if (this.dialogStatus.boys === 10 && group === 'boys') {
			if (inventory.inInventory[chosenGame] !== 'game') {
				dialog.startDialog(dialogNotAGame, this.nothing.bind(this));
			} else if (this.dialogStatus.boysGame !== 'none') {
				dialog.startDialog(dialogStillPlaying, this.nothing.bind(this));
			} else {
				dialog.startDialog(dialog0, this.nothing.bind(this));
				this.dialogStatus.boysGame = chosenGame;
				inventory.removeItem(chosenGame);
  		   	// They have a game
  		   	//check if it is the correct one
  		   	if (acceptableBoys.indexOf(chosenGame) > -1) {
  					 this.dialogStatus.boys = 69;
  				} else {
  		   	  this.dialogStatus.boys = 60;
  					setTimeout(function(){
  						root.checkOnGroup(11);
  					}, delay);
  				}
			}
		} else if (this.dialogStatus.girls === 10 && group === 'girls'){
		    // They have a game
		    //check if it is the correct one
			if (inventory.inInventory[chosenGame] !== 'game') {
				dialog.startDialog(dialogNotAGame, this.nothing.bind(this));
			} else if (this.dialogStatus.girlsGame !== 'none') {
				dialog.startDialog(dialogStillPlaying, this.nothing.bind(this));
			} else {
				dialog.startDialog(dialog0, this.nothing.bind(this));
				this.dialogStatus.girlsGame = chosenGame;
				inventory.removeItem(chosenGame);
  		   	// They have a game
  		   	//check if it is the correct one
  		   	if (acceptableGirls.indexOf(chosenGame) > -1) {
  					 this.dialogStatus.girls = 69;
  				} else {
  		   	  this.dialogStatus.girls = 60;
  					setTimeout(function(){
  						root.checkOnGroup(101);
  					}, delay);
  				}

			}
		}
		
		if (this.dialogStatus.girls === 69 && this.dialogStatus.boys === 69 &&  this.dialogStatus.mixed === 69 && this.vaggelisStatus === 'none') {
			// all customers are happy
			//Dialog with Vaggelis towards the end
			

			//If dialog0 ended at start or at dialog3
			
			this.vaggelisStatus = 'talked';
			setTimeout(function(){
				root.checkOnGroup(666);
			}, 15000);
		}
	}
	
	nothing() {}
	
	leave() {
		this.currentLocation = 'gone';
		gameScreen.emtyAll();
		map.enter();
	}
}

class playhouseWallGame {
	constructor() {
		this.selectIndicator = document.createElement('div');
		this.selectIndicator.className = 'playhouseWallSelector';
		this.gameList = {'yinsh': {up: 'cafe international', down: 'blokus', left: 'gipf', right: 'zertz'},
			'cafe international': {up: 'zicke zacke', down: 'yinsh', left: 'villa paletti', right: 'fantasmatakia'},
			'blokus': {up: 'yinsh', down: 'blokus duo', left: 'nyxta twn magwn', right: 'tayrakia'},
			'gipf': {up: 'villa paletti', down: 'nyxta twn magwn', left: 'tamsk', right: 'yinsh'},
			'zertz': {up: 'fantasmatakia', down: 'tayrakia', left: 'yinsh', right: 'dvonn'},
			'zicke zacke': {up: 'nyxta twn magwn', down: 'cafe international', left: 'didi dotter', right: 'blokus duo'},
			'villa paletti': {up: 'didi dotter', down: 'tamsk', left: 'trena', right: 'cafe international'},
			'fantasmatakia': {up: 'ageladopazaro', down: 'zertz', left: 'cafe international', right: 'tyfles kotes'},
			'blokus duo': {up: 'blokus', down: 'fantasmatakia', left: 'zicke zacke', right: 'ageladopazaro'},
			'nyxta twn magwn': {up: 'gipf', down: 'zicke zacke', left: 'set', right: 'blokus'},
			'tayrakia': {up: 'zertz', down: 'heimlich', left: 'blokus', right: 'rage'},
			'tamsk': {up: 'villa paletti', down: 'robotakia', left: 'thats life', right: 'gipf'},
			'dvonn': {up: 'lost cities', down: 'halli galli', left: 'zertz', right: 'punct'},
			'punct': {up: 'make and break', down: 'blokus trigon', left: 'dvonn', right: 'thats life compact'},
			'rage': {up: 'dvonn', down: 'heimlich', left: 'tayrakia', right: 'halli galli'},
			'heimlich': {up: 'rage', down: 'labyrinthos', left: 'blokus', right: 'ligretto'},
			'ligretto': {up: 'halli galli', down: 'filou', left: 'heimlich', right: 'taluva'},
			'halli galli': {up: 'dvonn', down: 'ligretto', left: 'rage', right: 'blokus trigon'},
			'blokus trigon': {up: 'punct', down: 'taluva', left: 'halli galli', right: 'thats life compact'},
			'taluva': {up: 'blokus trigon', down: 'make and break', left: 'ligretto', right: 'high score'},
			'make and break': {up: 'taluva', down: 'punct', left: 'lost cities', right: 'quarto'},
			'filou': {up: 'ligretto', down: 'phase ten', left: 'labyrinthos', right: 'taluva'},
			'lost cities': {up: 'phase ten', down: 'dvonn', left: 'tyfles kotes', right: 'make and break'},
			'tyfles kotes': {up: 'ageladopazaro', down: 'zertz', left: 'fantasmatakia', right: 'lost cities'},
			'ageladopazaro': {up: 'heimlich', down: 'tyfles kotes', left: 'blokus duo', right: 'labyrinthos'},
			'robotakia': {up: 'tamsk', down: 'kaleidos', left: 'kahuna', right: 'set'},
			'set': {up: 'tamsk', down: 'didi dotter', left: 'robotakia', right: 'nyxta twn magwn'},
			'kaleidos': {up: 'robotakia', down: 'trena', left: 'quarto', right: 'villa paletti'},
			'trena': {up: 'kaleidos', down: 'thats life', left: 'quarto', right: 'villa paletti'},
			'kahuna': {up: 'thats life', down: 'kaleidos', left: 'high score', right: 'robotakia'},
			'didi dotter': {up: 'set', down: 'villa paletti', left: 'robotakia', right: 'zicke zacke'},
			'quarto': {up: 'high score', down: 'thats life compact', left: 'make and break', right: 'kaleidos'},
			'high score': {up: 'thats life compact', down: 'quarto', left: 'taluva', right: 'kahuna'},
			'thats life': {up: 'trena', down: 'kahuna', left: 'thats life compact', right: 'tamsk'},
			'thats life compact': {up: 'quarto', down: 'high score', left: 'blokus trigon', right: 'thats life'},
			'labyrinthos': {up: 'heimlich', down: 'tyfles kotes', left: 'ageladopazaro', right: 'filou'},
			'phase ten': {up: 'filou', down: 'lost cities', left: 'labyrinthos', right: 'taluva'}
		};
		for (let game in this.gameList){
			this.gameList[game].status = 'available';
		};
		
		this.menu = {buttonArrows: 'select game', buttonStart: 'leave', buttonB: 'take game', buttonSelect: 'inventory', buttonX: 'put game back'};


		// Display the ??
		this.answerDisplay = document.createElement('div');
		this.answerDisplay.setAttribute('class', 'answerDisplay');
		
		// Create the hangman svg
		this.hangmanSvg = document.createElementNS(svgNamespace,'svg');
		this.hangmanSvg.setAttribute('class', 'hangmanSvg');
		this.hangmanSvg.setAttribute('viewBox', '0 0 100 100');

		const path = document.createElementNS(svgNamespace,'path');
		this.hangmanSvg.append(path);
		// Move (M) to (0,0) and draw a line (L) to (100,100)
		path.setAttribute('d', 'M 10 95 L 50 95 M 20 95 L 20 10 L 60 10 M 30 10 L 20 20' );

		const path2 = document.createElementNS(svgNamespace,'path');
		path2.setAttribute('d', 'M 55 10 L 55 20' );

		const path3 = document.createElementNS(svgNamespace,'circle');
		path3.setAttribute('cx', '55');
		path3.setAttribute('cy', '30');
		path3.setAttribute('r', '10 ');

		const path4 = document.createElementNS(svgNamespace,'path');
		path4.setAttribute('d', 'M 55 40 L 55 70' );

		const path5 = document.createElementNS(svgNamespace,'path');
		path5.setAttribute('d', 'M 48 90 L 55 70 L 62 90' );

		const path6 = document.createElementNS(svgNamespace,'path');
		path6.setAttribute('d', 'M 45 45 L 55 55 L 65 45' );

		this.bodyParts = [path2, path3, path4, path5, path6];
		///////////////////////////////////////////////////

		this.gameDisplay = document.createElement('img');
		this.gameDisplay.className = 'hangmanGameDisplay';
		document.body.append(this.gameDisplay);
		this.hangmanActive = false;
		this.firstTime = true;
		this.firstHangman = true;
		this.needToBlur = true;
	}
	
	startGame() {
		gameScreen.loadImage('playhouseWall');
		
		if (this.needToBlur) {
			// blur all the games and save the image elements in gameList
			for (let game in this.gameList) {
				let image = document.getElementById(game.replace(/ /g, `_`));
				if (image) {
					this.gameList[game].image = image;
					image.setAttribute('filter', 'url(#blurGame)');
				} else {
					console.log(`ERROR: game not found - ${game}`)
				}
			}
			this.needToBlur = false;
		}
		
		
		// select first game
		document.body.append(this.selectIndicator);
		this.selectGame('gipf');
		
		// show correct instructions
		menu.setMenu(this.menu);
		
		// if first time show message
		if (this.firstTime) {
			typewriter.showMessage(['Ο καλος παιχνιδογνωστης ξερει τα παιχνιδια του.', ` But your memory is a bit`, ' blurry!']);
			this.firstTime = false;
		}
		//this.winGame('labyrinthos');
		//this.winGame('set');
		//this.winGame('gipf');
		//this.winGame('ligretto');
		//this.winGame('kaleidos');
	}
	
	stopGame(){
		// make all failed games available again
		for (let id in this.gameList) {
			if (this.gameList[id].status === 'failed') {
				this.gameList[id].status = 'available';
			}
		}
		
		this.selectIndicator.remove();
		playhouse.leaveWall();
	}
	
	keyPressed(changes) {

		for (let key in changes) {
			if (key === 'UpDown') {
				if (changes[key] === -1) {
					this.selectGame(this.gameList[this.selected].up);
				} else if (changes[key] === 1) {
					this.selectGame(this.gameList[this.selected].down);
				}
			} else if (key === 'LeftRight') {
				if (changes[key] === -1) {
					this.selectGame(this.gameList[this.selected].left);
				} else if (changes[key] === 1) {
					this.selectGame(this.gameList[this.selected].right);
				}
			} else if (key === 'B' && changes[key] === 1) {
				if (inventory.gamesInInventory > 4) {
					typewriter.showMessage([`Don't you think you have enough games now?`, ` Maybe try and serve some customers for a change!`]);
				} else if (this.gameList[this.selected].status == 'failed') {
					typewriter.showMessage(['You already tried this', ` and failed!`, ' Maybe try again later!']);
				} else if (this.gameList[this.selected].status == 'available') {
					this.startHangman();
				} else if (this.gameList[this.selected].status == 'returned') {
					inventory.addItem(this.selected, 'game');
					this.gameList[this.selected].image.style.opacity = 0;
				}
			} else if (key === 'Start' && changes[key] === 1) {
				console.log('leaving wall');
				this.stopGame();
			} else if (key === 'Select' && changes[key] === 1) {
				// open inventroy
				inventory.enter();
			} else if (key === 'X' && changes[key] === 1) {
				// return game
				const itemID = inventory.selected;
				const itemType = inventory.inInventory[itemID];
				console.log(`trying to place back game: ${itemID}, type: ${itemType}`);
				if (this.gameList[itemID]) {
					this.gameList[itemID].image.setAttribute('filter', '');
					this.gameList[itemID].image.style.opacity = 1;
					inventory.removeItem(itemID);
					this.gameList[itemID].status = 'returned';
				}
				
			}
		}
	}

	keyPressedHangman(changes) {
		for (let key in changes) {
			if (key === 'UpDown' || key === 'LeftRight') {
				keyboard.keyPressed(changes);
			} else if (key === 'B' && changes[key] === 1) {
				console.log('chosen letter')
				const letter = String.fromCharCode(65 + keyboard.keySelected);
				this.checkAnswer(letter);

			} else if (key === 'Start' && changes[key] === 1) {
				console.log('leaving wall');

			}
		}
	}

	startHangman(){
		this.hangmanActive = true;
		keyboard.show();
		const image = this.gameList[this.selected].image.getAttributeNS(xlinkNamespace, 'href');
		this.selectIndicator.style.visibility = 'hidden';

		this.gameDisplay.setAttribute('src', image);
		gameScreen.hideAll();

		document.body.append(this.answerDisplay);
    	document.body.append(this.hangmanSvg);

		this.wrongGuess = 0;
		this.correctAnswer = this.selected.toUpperCase();
		this.letterInput = [];
		for (let i = 0; i < this.selected.length; i++){
			this.letterInput[i] = document.createElement('div');
			if (this.selected[i] == ' '){
				this.letterInput[i].setAttribute('class', 'letterInputSpace');
				this.letterInput[i].innerHTML = " ";
			} else{
				this.letterInput[i].setAttribute('class', 'letterInput');
			}
			this.answerDisplay.append(this.letterInput[i]);
		}
		
		menu.setMenu({buttonArrows: 'select letter', buttonB: 'make a guess'});
		
		if (this.firstHangman) {
			typewriter.showMessage(['Before you can take a game from the wall', ` you need to know which game it is!`, ' ', 'You are NOT Panos', ', prove it!']);
			this.firstHangman = false;
			typewriter.playAfter = 'wallMusic';
		} else {
			jukebox.playSong('wallMusic');
		}
	}

	checkAnswer(letter){
		let correctGuess = false;
		let gameWon = true;
		for (var i = 0; i < this.correctAnswer.length; i++) {
			if (this.correctAnswer[i] == letter){
				this.letterInput[i].innerHTML = letter;
				correctGuess = true;
			} else if (this.letterInput[i].innerHTML!==this.correctAnswer[i]){
				gameWon = false;
			} 
			
		}
		if (!correctGuess) {
			this.hangmanSvg.append(this.bodyParts[this.wrongGuess]);
   			this.wrongGuess++;

 			if (this.wrongGuess >= 5) {
  				this.gameLost();
 			}
		}
		if (gameWon){
			this.gameWon();
		}
	}

	gameWon() {
		inventory.addItemSrc(this.gameList[this.selected].image.getAttributeNS(xlinkNamespace, 'href'), this.selected);
		this.gameList[this.selected].image.style.opacity = 0;
		this.gameList[this.selected].status = 'won';
		this.resetGame();
	}
	
	winGame(id) {
		inventory.addItemSrc(this.gameList[id].image.getAttributeNS(xlinkNamespace, 'href'), id);
		this.gameList[id].image.style.opacity = 0;
		this.gameList[id].status = 'won';
	}
	
	gameLost(){
		jukebox.playSound('looseHangman');
		this.gameList[this.selected].status = 'failed';
		const root = this;
		setTimeout(function(){
			root.resetGame();
		}, 4000);
	}
	
	resetGame() {
		this.hangmanActive = false;
		keyboard.hide();
		this.selectIndicator.style.visibility = 'visible';

		this.gameDisplay.setAttribute('src', '');
		gameScreen.showAll();

		this.answerDisplay.remove();
		this.hangmanSvg.remove();
		this.letterInput.forEach(element => {
			element.remove();
		});
		this.bodyParts.forEach(element => {
			element.remove();
		});
		
		menu.setMenu(this.menu);
	}
	
	selectGame(id) {
		this.selected = id;
		const bbox = this.gameList[id].image.getBoundingClientRect();
		this.selectIndicator.style.left = `${bbox.left}px`;
		this.selectIndicator.style.top = `${bbox.top}px`;
		this.selectIndicator.style.width = `${bbox.width}px`;
		this.selectIndicator.style.height = `${bbox.height}px`;
	}
}

class locationClass {
	constructor(imageID, menu, intro, walkMatrix, musicID = 'playhouseMusic') {
		this.imageID = imageID;
		this.musicID = musicID;
		this.intro = intro;
		this.walkMatrix = walkMatrix;
		this.menu = menu;
		this.firstTime = true;
	}
	
	enter() {
		// load images
		gameScreen.emtyAll();
		gameloop.currentHandler = this;
		menu.setMenu({});
		this.introFinished = false;
		const bbox = gameScreen.loadImage(this.imageID);
		this.bbox = {width: bbox.width, height: bbox.height, right: bbox.width, bottom: bbox.height};
		
		// place avatar and start intro animation
		this.walkStatus = this.intro.move;
		avatar.load(this.intro.xPos * this.bbox.width, this.intro.yPos * this.bbox.height, this.intro.size * this.bbox.height);
		avatar.startWalkingAnimation(this.intro.move);
		this.timer = setInterval(this.animateIntro.bind(this), 150);
		
		// if he has been here before start playing music right away
		// on first entry dont play any music until the message was shown
	   if (this.firstTime) {
	  		jukebox.stopMusic();
	  	} else {
	  		jukebox.playSong(this.musicID);
	  	}
		
		this.onEnter();
	}
	
	onEnter() {}
	
	animateIntro() {
		this.animateWalk();
		let x = avatar.posX / this.bbox.width;
		let y = avatar.posY / this.bbox.height;
		
		if (this.intro.move === 'left' && x < this.intro.stop) {
			this.endIntro();
		} else if (this.intro.move === 'right' && x > this.intro.stop) {
			this.endIntro();
		} else if (this.intro.move === 'back' && y < this.intro.stop) {
			this.endIntro();
		} else if (this.intro.move === 'front' && y > this.intro.stop) {
			this.endIntro();
		}
	}
	
	endIntro() {
		clearInterval(this.timer);
		avatar.stopWalkingAnimation();
		this.walkStatus = 'idle';
		this.introFinished = true;
		menu.setMenu(this.menu);
		avatar.currentAvatar = avatar.avatarToFront;
		if (this.firstTime) {
			typewriter.showMessage(this.intro.message);
			typewriter.playAfter = this.musicID;
			this.firstTime = false;
		}
	}
	
	stopMoving() {
		clearInterval(this.timer);
		avatar.stopWalkingAnimation();
		this.walkStatus = 'idle';
	}
	
	keyPressed(changes) {
		if (this.introFinished) {
			this.updateMoveDirection(changes);
			
			if (changes.Start) {
				// to map
				this.leave();
			} else if (changes.Select) {
				// select item in inventory
				inventory.enter();
			}
			const x = avatar.posX / this.bbox.width;
			const y = avatar.posY / this.bbox.height;
			this.otherKeyActions(changes, x, y);
		}
	}
	
	updateMoveDirection(changes) {
		
		let walkDirection = 'none';
		let newAvatar = 'none';
		if (changes.UpDown === -1 && this.walkStatus === 'idle' && this.walkMatrix.back === 'none') {
			// face backwards
			newAvatar = avatar.avatarToBack;
		} else if (changes.UpDown === -1 && this.walkStatus !== 'back' && this.walkMatrix.back !== 'none') {
			// walk backwards
			walkDirection = 'back';
		} else if (changes.UpDown === 1 && this.walkStatus === 'idle' && this.walkMatrix.front === 'none') {
			// face forwards
			newAvatar = avatar.avatarToFront;
		} else if (changes.UpDown === 1 && this.walkStatus !== 'front' && this.walkMatrix.front !== 'none') {
			// walk forwards
			walkDirection = 'front';
		} else if (changes.LeftRight === -1 && this.walkStatus === 'idle' && this.walkMatrix.left === 'none') {
			// face left
			newAvatar = avatar.avatarToLeft;
		} else if (changes.LeftRight === -1 && this.walkStatus !== 'left' && this.walkMatrix.left !== 'none') {
			// walk left
			walkDirection = 'left';
		} else if (changes.LeftRight === 1 && this.walkStatus === 'idle' && this.walkMatrix.right === 'none') {
			// face right
			newAvatar = avatar.avatarToRight;
		} else if (changes.LeftRight === 1 && this.walkStatus !== 'right' && this.walkMatrix.right !== 'none') {
			// walk right
			walkDirection = 'right';
		}
		
		if (newAvatar !== 'none') {
			// character does not start moving but faces in a different direction
			avatar.currentAvatar = newAvatar;
		} else if (walkDirection !== 'none') {
			// start walking
			avatar.startWalkingAnimation(walkDirection);
			if (this.walkStatus === 'idle') {
				this.timer = setInterval(this.animateWalk.bind(this), 150);
			}
			this.walkStatus = walkDirection;
		}
		
		// check for stop walking
		if (changes.LeftRight == 0 && ['left', 'right'].indexOf(this.walkStatus) > -1) {
			this.stopMoving();
		} else if (changes.UpDown == 0 && ['front', 'back'].indexOf(this.walkStatus) > -1) {
			this.stopMoving();
		}
	}
	
	animateWalk() {
		// calculate new position and size
		let newX, newY, newSize;
		if (this.walkStatus === 'left') {
			newX = avatar.posX - this.walkMatrix.left * avatar.size;
			newY = avatar.posY;
		} else if (this.walkStatus === 'right') {
			newX = avatar.posX + this.walkMatrix.right * avatar.size;
			newY = avatar.posY;
		} else if (this.walkStatus === 'back') {
			newX = avatar.posX + this.walkMatrix.back[0] * avatar.size;
			newY = avatar.posY - this.walkMatrix.back[1] * avatar.size;
			newSize = avatar.size * this.walkMatrix.back[2];
		} else if (this.walkStatus === 'front') {
			newSize = avatar.size / this.walkMatrix.front[2];
			newX = avatar.posX - this.walkMatrix.front[0] * newSize;
			newY = avatar.posY + this.walkMatrix.front[1] * newSize;
		}
		
		let collision = false;
		if (this.introFinished) {
			// check for collision
			const x = newX / this.bbox.width;
			const y = newY / this.bbox.height;
			collision = this.checkCollisions(x,y);
		}
		
		if (collision) {
			// collision occured -> stop walking
			this.stopMoving();
		} else {
			//console.log(`setting new pos: ${newX}, ${newY}`);
			// no collision -> set new position and size
			avatar.posX = newX;
			if (this.walkStatus === 'back' || this.walkStatus === 'front') {
				avatar.posY = newY;
				avatar.size = newSize;
			}
		}
	}
	
	checkCollisions(x,y) {}
	
	otherKeyActions(changes) {}
	
	leave() {
		gameScreen.emtyAll();
		map.enter();
	}
}

class mcDonaldsClass extends locationClass {
	constructor() {
		const message = ['Welcome to MC Donalds!', 'OMG, this is THE best place for icecream and fries!'];
		const intro = {size: 0.7, xPos: 0.5, yPos: 0.9, move: 'back', stop: 0.7, message: message};
		const walkMatrix = {left: 0.05, right: 0.05, back: [0, 0.03, 0.99], front: [0, 0.03, 0.99]};
		const menu = {buttonArrows: 'move', buttonSelect: 'inventory', buttonX: 'talk', buttonStart: 'back to map', buttonB: 'look closer'};
		super('mcDonalds', menu, intro, walkMatrix);
		this.gameStatus = 'idle';
		this.conversationStatus = 0;
	}
	
	checkCollisions(x,y) {
		if (y < 0.22) {
			return true;
		} else if (x > 0.556) {
			return true;
		} else if (x < 0.38) {
			return true;
		} else if (y < 0.3 && x < 0.47) {
			return true;
		} else if (y > 1) {
			// leave mc donalds
			if (this.conversationStatus === 1 || this.conversationStatus === 2) {
				// if he leaves before the cashier is ready for him
				this.conversationStatus = 0;
				clearTimeout(this.readyToOrderTimer);
			}
			this.leave();
			return true;
		}
		return false;
	}
	
	otherKeyActions(changes, x, y) {
		if (changes.X === 1 && this.walkStatus === 'idle' && y < 0.28 && avatar.currentAvatar === avatar.avatarToBack) {
			// talk to lady at the counter
			this.dialog0 = {
				class: 'mcDonalds',
				start: {text: "Sorry sir, you will have to wait in line, I'm serving this nice lady at the moment!", answer1:['OK, I am sorry!','end'], answer2:['But I only want some fries!', 'dialog1'], answer3:['Ok ok, take a chill-pill!', 'dialog2']},
				dialog1: {text: "I am sorry, but if everyone would start cutting the line, this place would end up in chaos!",  answer1:['Thats not really my problem now, is it?','dialog2'], answer2:['Ok I will wait in line','end']},
				dialog2: {text: 'What did you just say? I really do not like your tone! Get in line or get lost!', answer1:['Ok fine! I will wait.','end'], answer2: ['I will get going then!', 'end']}
			};
			
			// after he insulted the lady before
			this.dialog1 = {
				class: 'mcDonalds',
				start:{ text: 'Wait in line or I will call the police!'}
			};
			
			// after he waits but its not his turn yet
			this.dialog2 = {
				class: 'mcDonalds',
				start:{ text: `It's only gonna be a little bit longer!'`}
			}
			
			// after he has waited his turn
			this.dialog3 = {
				class: 'mcDonalds',
		    	start:{ text: "Hello, what can I get you?", answer1:['Hi, I would like a portion of fries (slurp)','dialog2'], answer2:['Gimme the fries! NOW!', 'dialog3']},
		    	dialog2:{ text:"Let me check... Ah yes yes, no we are out at the moment.",  answer1:['What? What do you mean? This cant be! Go get some!','dialog4'], answer2:['What? I wont have this! Where is your manager? I came here for fries!','dialog4']},
		    	dialog3: {text:'Watch your tone mister!', answer1:['GIMME THE FRIES NOW!','dialog4'], answer2:['Is this some kind of joke? Cause its not funny. Can you get some fries now?', 'dialog4']},
		    	dialog4:{text: 'Go get the fries yourself! Now out of my line, we are busy here!'}
			};
			
			// after he fails he can try again
			this.dialog4 = {
			    class: 'mcDonalds',
			    start:{ text: "Yeeees?", answer1:['Em, excuse me. I dropped some fries.','dialog2'], answer2:['What yes? You know why I am here!', 'dialog3']},
			    dialog2:{ text:"I saw, dont you worry. Useless...",  answer1:['Now what? There are more, I know. Can I get some more?','dialog4'], answer2:['You saw and did nothing! I want more!','dialog4']},
			    dialog3: {text:'You got what you deserve ha ha', answer1:['GIMME MORE FRIES NOW!','dialog4'], answer2:['This time I can make it!', 'dialog4']},
			    dialog4:{text: 'Go and try again, be more careful this time!'}
			}
			
			// after he failed more than once
			this.dialog5 = {
			    class: 'mcDonalds',
			    start:{ text: "Ah the dropping-fries-guy again. You know what to do!"}

			}
			
			// after he won
			this.dialog10 = {
			    class: 'mcDonalds',
			    start:{ text: "You again! Now we are completely out of fries!"}

			}
			
			if (this.conversationStatus === 1 || this.conversationStatus === 2) {	
				clearTimeout(this.readyToOrderTimer);
			}
			
			dialog.startDialog(this[`dialog${this.conversationStatus}`], this.dialogEnded.bind(this));
		} 
	}
	
	dialogEnded(dialog, answer) {
		if (this.conversationStatus === 0) {
			if (dialog === 'dialog2') {
				this.conversationStatus = 1;
			} else {
				this.conversationStatus = 2;
			}
			const root = this;
			this.readyToOrderTimer = setTimeout(function(){
				root.conversationStatus = 3;
				typewriter.showMessage(['I am ready for you now!'], 'mcDonalds');
			}, 20000);
		} else if (this.conversationStatus === 1 || this.conversationStatus === 2) {
			const root = this;
			this.readyToOrderTimer = setTimeout(function(){
				root.conversationStatus = 3;
				typewriter.showMessage(['I am ready for you now!'], 'mcDonalds');
			}, 20000);
		} else if (this.conversationStatus === 3 || this.conversationStatus === 4 || this.conversationStatus === 5) {
			// its his turn to play
			this.startGame();
		}
	}
	
	startGame() {
		avatar.hide();
		friesGame.enter();
	}
	
	returnFromGame(result) {
		avatar.show();
		gameloop.currentHandler = this;
		menu.setMenu(this.menu);
		jukebox.playSong(this.musicID);
		gameScreen.loadImage('mcDonalds');
		
		if (result === 'won') {
			this.gameStatus = 'won';
			typewriter.showMessage(['Congratulations!', ' You have acquired a fatty little treat!']);
			// he can no longer talk to the cashier
			this.conversationStatus = 10;
		} else if (result === 'lost') {
			this.gameStatus = 'lost';
			typewriter.showMessage(['Too bad', ', you did not collect enough fries for a full serving!']);
			if (this.conversationStatus < 5) {
				this.conversationStatus++;
			}
		}
	}
}

class friesGameClass {
	constructor() {
	}
	
	enter() {
		gameloop.currentHandler = this;
		menu.setMenu({});
		jukebox.playSong('gameMusic');
		const bbox = gameScreen.loadImage('friesGame');
		this.bbox = {width: bbox.width, height: bbox.height, right: bbox.width, bottom: bbox.height};
		this.avatar = document.getElementById('friesGame_Avatar');
		this.fries1 = document.getElementById('friesGame_fries1');
		this.fries2 = document.getElementById('friesGame_fries2');
		this.fries3 = document.getElementById('friesGame_fries3');
		
		this.counterEaten = document.getElementById('friesGame_Counter1');
		this.counterMissed = document.getElementById('friesGame_Counter2');
		this._eaten = 0;
		this._missed = 0;
		
		this.c1 = 1000;
		this.c2 = 1000;
		
		this.friesPos = [700, 700, 700];
		this.friesStatus = [1, 1, 1];
		this.friesTurningPoint = [this.getRandom(), this.getRandom(), this.getRandom()];
		
		this.avatarPos = 0;
		
		this.movement = 'none';
		this.timer = setInterval(this.frame.bind(this), 50);
	}
	
	getRandom() {
		return this.c1 + Math.random() * this.c2;
	}
	
	set eaten(n) {
		this._eaten = n;
		this.counterEaten.children[0].innerHTML = `FRIES eaten: ${n}`;
	}
	
	get eaten() {
		return this._eaten;
	}
	
	set missed(n) {
		this._missed = n;
		this.counterMissed.children[0].innerHTML = `FRIES missed: ${n}`;
	}
	
	get missed() {
		return this._missed;
	}
	
	keyPressed(changes) {
		if (changes.LeftRight === -1) {
			// left
			this.movement = 'left';
		} else if (changes.LeftRight === 1) {
			// right
			this.movement = 'right';
		} else if (changes.LeftRight == 0) {
			this.movement = 'none';
		}
		
		if (changes.X === 1) {
			console.log(this.avatarPos);
		}
	}
	
	frame() {
		this.moveAvatar();
		this.moveFries();
	}
	
	moveAvatar() {
		let step = 20;
		if (this.eaten + this.missed > 10) {
			step = 30;
		} else if (this.eaten + this.missed > 25) {
			step = 40;
		}
		
		if (this.movement === 'right') {
			this.avatarPos = this.avatarPos + step;
		} else if (this.movement === 'left') {
			this.avatarPos = this.avatarPos - step;
		}
		this.avatar.setAttribute('transform', `translate(${this.avatarPos} 0)`);
	}
	
	moveFries() {
		let step = 10;
		if (this.eaten + this.missed > 10) {
			step = 15;
		} else if (this.eaten + this.missed > 25) {
			step = 20;
		}
		
		if (this.eaten >= 30) {
			this.gameWon();
		}
		if (this.missed >= 10) {
			this.gameLost();
		}
		
		this.friesPos[0] = this.friesPos[0] + step;
		this.friesPos[1] = this.friesPos[1] + step;
		this.friesPos[2] = this.friesPos[2] + step;
		this.fries1.setAttribute('transform', `translate(0 ${this.friesPos[0]})`);
		this.fries2.setAttribute('transform', `translate(0 ${this.friesPos[1]})`);
		this.fries3.setAttribute('transform', `translate(0 ${this.friesPos[2]})`);
		
		
		if (this.friesPos[0] > 500 && this.friesStatus[0] === 0) {
			// check if avatar is in position
			if (this.avatarPos > -405 && this.avatarPos < -285) {
				// fires have been caught
				this.eaten = this.eaten + 1;
				this.friesPos[0] = 700;
				jukebox.playSound('eatFries');
			} else {
				this.missed = this.missed + 1;
			}
			this.friesStatus[0] = 1;
		} else if (this.friesPos[0] > this.friesTurningPoint[0]) {
			this.friesPos[0] = 0;
			this.friesStatus[0] = 0;
			this.friesTurningPoint[0] = this.getRandom();
		}
		
		if (this.friesPos[1] > 500 && this.friesStatus[1] === 0) {
			// check if avatar is in position
			if (this.avatarPos > -60 && this.avatarPos < 75) {
				// fires have been caught
				this.eaten = this.eaten + 1;
				this.friesPos[1] = 700;
			} else {
				this.missed = this.missed + 1;
			}
			this.friesStatus[1] = 1;
		} else if (this.friesPos[1] > this.friesTurningPoint[1]) {
			this.friesPos[1] = 0;
			this.friesStatus[1] = 0;
			this.friesTurningPoint[1] = this.getRandom();
		}
		
		if (this.friesPos[2] > 500 && this.friesStatus[2] === 0) {
			// check if avatar is in position
			if (this.avatarPos > 270 && this.avatarPos < 420) {
				// fires have been caught
				this.eaten = this.eaten + 1;
				this.friesPos[2] = 700;
			} else {
				this.missed = this.missed + 1;
			}
			this.friesStatus[2] = 1;
		} else if (this.friesPos[2] > this.friesTurningPoint[2]) {
			this.friesPos[2] = 0;
			this.friesStatus[2] = 0;
			this.friesTurningPoint[2] = this.getRandom();
		}
	}
	
	gameWon() {
		console.log('game won');
		clearInterval(this.timer);
		inventory.addItem('item_fries');
		setTimeout(function(){
			gameScreen.emtyAll();
			mcDonalds.returnFromGame('won');
		}, 5000);
	}
	
	gameLost() {
		console.log('game lost');
		clearInterval(this.timer);
		jukebox.playSound('looseHangman');
		setTimeout(function(){
			gameScreen.emtyAll();
			mcDonalds.returnFromGame('lost');
		}, 2000);
		
	}
	
}

class busStopClass extends locationClass {
	constructor() {
		const message = ['Welcome to the astiko ktel Ioanninwn!'];
		const intro = {size: 0.7, xPos: 1, yPos: 0.5, move: 'left', stop: 0.7, message: message};
		const walkMatrix = {left: 0.05, right: 0.05, back: [0, 0.03, 0.95], front: [0, 0.03, 0.95]};
		const menu = {buttonArrows: 'move', buttonSelect: 'inventory', buttonX: 'talk', buttonStart: 'back to map', buttonB: 'look closer'};
		super('busStop', menu, intro, walkMatrix);
		this.conversationStatus = 0;
	}
	
	onEnter() {
		// check which items have been acquired
		if (!inventory.checkForItem('item_busticket')) {
			this.conversationStatus = 0;
		} else if (!inventory.checkForItem('item_studentID')) {
			this.conversationStatus = 1;
		} else if (inventory.checkForItem('item_icecream') && inventory.checkForItem('item_fries')) {
			this.conversationStatus = 5;
		} else if (inventory.checkForItem('item_icecream')) {
			this.conversationStatus = 4;
		} else if (inventory.checkForItem('item_fries')) {
			this.conversationStatus = 3;
		} else {
			this.conversationStatus = 2;
		}
		
		console.log(`status for bus is: ${this.conversationStatus}`);
	}
	
	checkCollisions(x,y) {
		if (y < 0.33) {
			return true;
		} else if (y < 0.47 && x < 0.25) {
			return true;
		} else if (y < 0.47 && x > 0.69) {
			return true;
		} else if (x < 0.1) {
			return true;
		}
		if (y > 1 || x > 1) {
			this.leave();
			return true;
		}
		return false;
	}
	
	otherKeyActions(changes, x, y) {
		if (changes.X === 1 && x < 0.31 && y < 0.37 && this.walkStatus === 'idle' && avatar.currentAvatar === avatar.avatarToLeft) {
			// talk to bus driver
			
			// First dialog
			this.dialog0 = {
			    // If he has no ticket
			    class: 'bus',
			    start:{ text: "Yes?", answer1:['Hi, is this the bus to the university?','dialog2'], answer2:['Hi, I want to go to the university.', 'dialog3']},
			    dialog2:{ text:"Yes, dont you know how to read?",  answer1:['Right, yes I read it.','dialog3'], answer2:['Wow some thing never change.. Yes I saw the great sign.','dialog3']},
			    dialog3: {text:'Congratulations. Where is your ticket?', answer1:['Oops I dont have one','dialog4']},
			    dialog4:{text: 'So what are you doing here? Get out of my bus!'}
			};

			this.dialog1 = {
			    // has a ticket, but no student id
			    class: 'bus',
			    start:{ text: "Yes?", answer1:['Hi, is this the bus to the university?','dialog2'], answer2:['Hi, I want to go to the university.', 'dialog2']},
			    dialog2:{ text:"Yes, this is the bus. Where is your ticket?",  answer1:['I have it right here.','dialog3'], answer2:['Finally a reasonable driver. Here it is.','dialog3']},
			    dialog3: {text:'Alright. Show me your student id.', answer1:['Aaaaam I dont have it with me','dialog4'], answer2:['Oh no! I forgot it...','dialog4']},
			    dialog4:{text: 'So what are you doing here? Get out of my bus!'}
			};

			this.dialog2 = {
			    // has a ticket and student id but no food
			    class: 'bus',
			    start:{ text: "Yes?", answer1:['Hi, is this the bus to the university?','dialog2'], answer2:['Hi, I want to go to the university.', 'dialog2']},
			    dialog2:{ text:"Yes, this is the bus. Where is your ticket?",  answer1:['I have it right here.','dialog3'], answer2:['Finally a reasonable driver. Here it is.','dialog3']},
			    dialog3: {text:'Alright. Show me your student id.', answer1:['Here','dialog4'], answer2:['Look how pretty I am','dialog4']},
			    dialog4: {text:'Whatever. Do you have food with you?', answer1:['What?! No, I will eat at the lesxi of course','dialog5']},
			    dialog5:{text: 'Sorry pal, the lesxi is closed today. The uni instructed that only students with food are allowed.'}
			};

			this.dialog3 = {
			    // has a ticket and student id, fries but no ice cream
			    class: 'bus',
			    start:{ text: "Yes?", answer1:['Hi, is this the bus to the university?','dialog2'], answer2:['Hi, I want to go to the university.', 'dialog2']},
			    dialog2:{ text:"Yes, this is the bus. Where is your ticket?",  answer1:['I have it right here.','dialog3'], answer2:['Here it is.','dialog3']},
			    dialog3: {text:'Alright. Show me your student id.', answer1:['Here','dialog4'], answer2:['Look how pretty I am','dialog4']},
			    dialog4: {text:'Whatever. Do you have food with you?', answer1:['Yes I do! I have fries.','dialog5']},
			    dialog5:{text: 'I am sorry, but you seem like you will need some ice cream as well.'}
			};
			
			this.dialog4 = {
			    // has a ticket and student id, ice cream but no fries
			    class: 'bus',
			    start:{ text: "Yes?", answer1:['Hi, is this the bus to the university?','dialog2'], answer2:['Hi, I want to go to the university.', 'dialog2']},
			    dialog2:{ text:"Yes, this is the bus. Where is your ticket?",  answer1:['I have it right here.','dialog3'], answer2:['Here it is.','dialog3']},
			    dialog3: {text:'Alright. Show me your student id.', answer1:['Here','dialog4'], answer2:['Look how pretty I am','dialog4']},
			    dialog4: {text:'Whatever. Do you have food with you?', answer1:['Yes I do! I have ice cream.','dialog5']},
			    dialog5:{text: 'I am sorry, but only desert is not enough you will need some savory food as well.'}
			};

			this.dialog5 = {
				 // has everything
			    class: 'bus',
			    start:{ text: "Yes?", answer1:['Hi, is this the bus to the university?','dialog2'], answer2:['Hi, I want to go to the university.', 'dialog2']},
			    dialog2:{ text:"Yes, this is the bus. Where is your ticket?",  answer1:['I have it right here.','dialog3'], answer2:['Here it is.','dialog3']},
			    dialog3: {text:'Alright. Show me your student id.', answer1:['Here','dialog4'], answer2:['Look how pretty I am','dialog4']},
			    dialog4: {text:'Wow, nice photo! Do you have food with you?', answer1:['Yes I do! I have fries and ice cream.','dialog5']},
			    dialog5:{text: 'Great! Get on, the bus is leaving!'}
			};
			
			this.dialog8 = {
				// not all items but tries again
			   class: 'bus',
				start:{ text: "I told you that I cannot take you like this!"}
			};
			
			dialog.startDialog(this[`dialog${this.conversationStatus}`], this.dialogEnded.bind(this));
		}
	}
	
	dialogEnded(dialog, answer) {
		if (this.conversationStatus === 5) {
			
		} else {
			this.conversationStatus = 8;
		}
	}
}

class libraryClass extends locationClass {
	constructor() {
		const message = ['Congratulations!', ' You have finally made it to the university.', ' Good luck with your records!'];
		//const message = ['bob'];
		const intro = {size: 0.7, xPos: -0.2, yPos: 0.5, move: 'right', stop: 0.2, message: message};
		const walkMatrix = {left: 0.05, right: 0.05, back: 'none', front: 'none'};
		const menu = {buttonArrows: 'move', buttonX: 'talk'};
		super('library', menu, intro, walkMatrix);
		this.conversationStatus = 0;
		this.totalTries = 0;
		this.loadDialog();
	}
	
	checkCollisions(x,y) {
		if (x > 0.9) {
			return true;
		} else if (x < 0) {
			return true;
		}
		return false;
	}
	
	loadDialog() {
		// First dialog
		this.dialog0 = {
			class: 'library',
			start:{ text: "Hello there, how can I help you?", answer1:['Hi, I have a question about my transcript','dialog2'], answer2:['There might be a problem with my transcript? Bring it please!', 'dialog4']},
			dialog2:{ text:"What is the question?",  answer1:['Can I see it?','dialog3'], answer2:['What is wrong with my transcript??','dialog3']},
			dialog3: {text:'Alright, maybe we should take a look at your transcript then', answer1:['What a good idea', 'dialog10'], answer2:['Lets do that then!', 'dialog10'], answer2:['Stop drinking coffees and bring me my transcript! I need my degree!', 'dialog4']},
			dialog4:{text: 'Dont get upset, we are working hard over here. Show some respect!', answer1:['Yes yes I know, can I see it now please?','dialog10'], answer2:['I know very well how "hard" you work.','dialog5'], answer3:['Enough chit chat, now bring the transcript over here!','dialog5']},
			dialog5: {text:'If you dont change your attitude, we might have a probelm over here.', answer1:['You are right, I apologise. Can I please see it?','dialog10'], answer2:['For sure we will have a problem! I will file a complaint!','dialog6']},
			dialog6: {text:'Haha let me get a coffee while you do so'},
			dialog10: {text:'At the moment we are super busy drinking coffee and with a Harry Potter quizz. The only way to convice the secretary to look for your document is by winning the quiz! Do you want to try?', answer1:['Yes, nobody beats me at Harry Potter!','end'], answer2:['No thanks', 'end']}
		}

		// If dialog0 ended in dialog6
		this.dialog1 = {
			class: 'library',
			start:{ text: "Hello again. Did you come to your senses?", answer1:['I guess so.','dialog2'], answer2:['Yes, I am sorry for before.', 'dialog2']},
			dialog2:{ text:"Good. What was the issue?",  answer1:['There is an issue with my last exam. I passed and you think I did not!','dialog3'], answer2:['I want to check if there is a mistake with my last exam!','dialog10']},
			dialog3: {text:'Alright, maybe we should take a look at your transcript then', answer1:['What a good idea', 'dialog10'], answer2:['Lets do that then!', 'dialog10']},
			dialog10: {text:'At the moment we are super busy drinking coffee and with a Harry Potter quizz. The only way to convice the secretary to look for your document is by winning the quiz! Do you want to try?', answer1:['Yes, nobody beats me at Harry Potter!','end'], answer2:['Bring it on!', 'end']}
		}
		
		// If dialog0 ended in dialog10, answer2
		this.dialog2 = {
			class: 'library',
			start:{ text: "Hello again. Did you change your mind about the quiz?", answer1:['Yes, nobody beats me at Harry Potter!','quiz'], answer2:['Bring it on!', 'quiz']}
		}
		
		// Quiz
		this.dialog3 = {
			class: 'library',
			intro: 'Ok here we go, I hope you read the books properly!',
			wrong1: 'Sorry, but that is wrong!',
			wrong2: 'Did you read the books at all?',
			wrong3: 'What the f***! You will never win the quiz like this!',
			correct1: 'Thats correct!',
			correct2: 'Well done, thats the right answer!',
			correct3: 'Correct again!',
			loose: 'If you had really read the books you would have done better!',
			win: 'Awesome, you are a real Harry Potter fan boy! If you ever wanna come over to discuss the 12 uses of dragon blood, give me a call! *wink*',
			question1: {text: `What do cats do to Hagrid?`, answer1:`Make him angry`, answer2:`Make him sneeze`, answer3:`Make him laugh`, answer4:`Cause him pain`, correct: 2},
			question2: {text: `What form does Rita Skeeter take as an Animagus?`, answer1:`A bird`, answer2:`A snake`, answer3:`A beetle`, answer4:`A squirrel`, correct: 3},
			question3: {text: `What is the title of the first chapter in Chamber of Secrets?`, answer1:`The Boy Who Lived`, answer2:`Dobby's Warning`, answer3:`The Keeper of the Keys`, answer4:`The Worst Birthday`, correct: 4},
			question4: {text: `How many languages has the Harry Potter book series been translated into?`, answer1:`45`, answer2:`92`, answer3:`67`, answer4:`39`, correct: 3},
			question5: {text: `What was the last name of Professor Trelawaney's former husband?`, answer1:`Niggemeyer`, answer2:`Peucey`, answer3:`Stroker`, answer4:`Higglebottom`, correct: 4},
			question6: {text: `What subject did Professor Quirrell teach before he taught Defense Against the Dark Arts?`, answer1:`Divination`, answer2:`Alchemy`, answer3:`Muggle Studies`, answer4:`Ancient Runes`, correct: 3},
			question7: {text: `Which of these ingredients is NOT used in a Polyjuice potion?`, answer1:`Powdered Unicorn Horn`, answer2:`Lacewing Flies`, answer3:`Powdered Bicorn Horn`, answer4:`Leeches`, correct: 1},
			question8: {text: `What fruit must you tickle in order to gain access to the Hogwarts kitchen?`, answer1:`Pear`, answer2:`Banana`, answer3:`Kiwi`, answer4:`Apple`, correct: 1},
			question9: {text: `What is the correct order of the Marauders on the Marauders' map?`, answer1:`Wormtail, Moony, Prongs, and Padfoot`, answer2:`Moony, Wormtail, Padfoot, and Prongs`, answer3:`Padfoot, Moony, Wormtail, and Prongs`, answer4:`Prongs, Wormtail, Moony, and Padfoot`, correct: 2},
			question10: {text: `What is Luna Lovegood's corporeal Patronus?`, answer1:`Cat`, answer2:`Hare`, answer3:`Dog`, answer4:`Finch`, correct: 2}
		}
		
		this.dialog3Intro2 = 'I am not sure you will ever win. But if you like losing I will not stop you!';

		// Quiz 2
		this.dialog4 = {
		   class: 'library',
			intro: 'Ok! I will give you another try. I mean sometimes even a Hufflepuff finds a way to glory.',
			wrong1: 'Wrong wrong wrong! You really suck at this!',
			wrong2: 'Are you a squib?',
			wrong3: 'Seriously? Now you are just wasting my time!',
			correct1: 'Good guess!',
			correct2: 'I am impressed! Maybe you are a Ravenclaw after all.',
			correct3: 'And correct again!',
			loose: 'I thought you said, you have some Harry Potter knowledge! I guess you do not even know who Albus Dumbledore is. (clearly disappointed)',
			win: 'Awesome, you are a real Harry Potter fan boy! If you ever wanna come over to discuss the 12 uses of dragon blood, give me a call! *wink*',
			question1: {text: `How many times was Calestina Warbeck married?`, answer1:`12`, answer2:`3`, answer3:`5`, answer4:`1`, correct: 2},
			question2: {text: `What does Molly like Arthur to call her in private?`, answer1:`Dearest`, answer2:`Mollybabe`, answer3:`Honey`, answer4:`Mollywobbles`, correct: 4},
			question3: {text: `What witch did Neville Longbottom marry?`, answer1:`Hannah Abbott`, answer2:`Luna Lovegood`, answer3:`Penelope Clearwater`, answer4:`Pansy Parkinson`, correct: 1},
			question4: {text: `What piece of advice does Ron give Harry when Harry asks if he can't cast a spell while dueling Malfoy?`, answer1:`Create a diversion and trip him`, answer2:`Throw something at him`, answer3:`Run away quickly`, answer4:`Throw it away and punch him in the nose`, correct: 4},
			question5: {text: `What is the first wizarding candy Harry eats?`, answer1:`Bertie Bott's Every Flavor Beans`, answer2:`Cockroach Cluster`, answer3:`Acid Pop`, answer4:`Chocolate Frog`, correct: 4},
			question6: {text: `Which Muggle candy did the Trolly Witch not sell, which Harry loved?`, answer1:`Snickers`, answer2:`Hershey Bars`, answer3:`Kit Kats`, answer4:`Mars Bars`, correct: 4},
			question7: {text: `What are the names of Severus Snape's parents?`, answer1:`Theodore Snape and Ethel Prince`, answer2:`Tobias Snape and Eileen Prince`, answer3:`Toby Snape and Ellen Prince`, answer4:`Tripp Snape and Eliana Prince`, correct: 2},
			question8: {text: `What was the codename that Fred was mistakenly called on Potterwatch?`, answer1:`Rodent`, answer2:`Rabbit`, answer3:`Rattlesnake`, answer4:`Rapier`, correct: 1},
			question9: {text: `What is the name of the Bulgarian Minister for Magic?`, answer1:`Desislav`, answer2:`Nedyalko`, answer3:`Tsvetan`, answer4:`Oblansk`, correct: 4},
			question10: {text: `In the book, what colour were the dress robes that Padma Patil wore to the Yule Ball?`, answer1:`Turquoise`, answer2:`Pink`, answer3:`Lime green`, answer4:`Magenta`, correct: 1}
		}
		
		// If he wins the quiz
		this.dialog5 = {
		    class: 'library',
		    start:{ text: "Wow you are really good at Harry Potter knowledge! Let me go and get the transcript.", answer1:['FI NA LLY','dialog2'],  answer2:['About time dont you think?', 'dialog2'], answer3:['Awesome, thanks.', 'dialog2']},
		    dialog2:{ text:"Here it is. Lets see... It seems fine to me!",  answer1:['But I passed the stupid plants! Why is there a 4 here??','dialog3'], answer2:['What fine lady? Here it says I failed the plants, which I DIDNT!','dialog3']},
		    dialog3: {text:'Ah! Mitsa must have mixed it up again haha! Let me check...', answer1:['Of course Mitsa mixed it up', 'dialog4'], answer2:['Yes sure no problem, take your time', 'dialog4'], answer2:['How funny HA HA, its only my degree after all', 'dialog4']},
		    dialog4:{text: 'Here, I fixed it. What was the fuss about, I dont understand you young people ts ts ts', answer1:['Ggrrrrr gggggrrrrr','dialog5'], answer2:['GGGRRRRR YES OF COURSE GGGRRRR','dialog5']},
		    dialog5: {text:'AH WAIT A SEC, you are Nikolaou right?', answer1:['Yes, what is it now?? (scared)','dialog6'], answer2:['Yes? Whaaat? Is there something wrong? (scared)','dialog6']},
		    dialog6: {text:'Some person came here earlier. She said she comes from the future haha crazy girl! Anyway, she insisted that if you came here to see your grade at plants, I should give you this. I wouldnt, but she said if I dont they will tongue-eat me and I got scared! So here it is...'}
		}
	}
	
	otherKeyActions(changes, x, y) {
		if (changes.X === 1 && x > 0.44 && x < 0.75 && this.walkStatus === 'idle' && avatar.currentAvatar === avatar.avatarToBack) {
			
			//quiz.start(this.dialog3, this.dialogEnded.bind(this));
			
			if (this.conversationStatus === 3 || this.conversationStatus === 4) {
				quiz.start(this[`dialog${this.conversationStatus}`], this.dialogEnded.bind(this));
			} else if (this.conversationStatus === 6) {
				// he won and has the book
				console.log('open book');
				window.location = 'photoAlbum2/index.html';
			} else {
				dialog.startDialog(this[`dialog${this.conversationStatus}`], this.dialogEnded.bind(this));
			}
		}
	}
	
	dialogEnded(dialog, answer) {
		if (this.conversationStatus === 0) {
			// first dialog
			if (dialog === 'dialog6') {
				this.conversationStatus = 1;
			} else if (dialog === 'dialog10' && answer === 2) {
				this.conversationStatus = 2;
			} else {
				this.conversationStatus = 3;
			}
		} else if (this.conversationStatus === 1 || this.conversationStatus === 2) {
			// dialog to get to quiz for sure
			this.conversationStatus = 3;
		} else if (this.conversationStatus === 3) {
			jukebox.playSong(this.musicID);
			// quiz 1 (dialog = true now means the quiz is won)
			if (dialog) {
				// quiz won!
				this.conversationStatus = 5;
			} else {
				// quiz lost
				// replace the intro of quiz 1 after the first round...
				this.dialog3.intro = this.dialog3Intro2;
				this.conversationStatus = 4;
			}
		} else if (this.conversationStatus === 4) {
			jukebox.playSong(this.musicID);
			// quiz 2
			if (dialog) {
				// quiz won!
				this.conversationStatus = 5;
			} else {
				// quiz lost -> back to quiz 1
				this.conversationStatus = 3;
			}
		} else if (this.conversationStatus === 5) {
			inventory.addItem('item_photoBook');
			this.conversationStatus = 6;
			menu.setMenu({buttonX: `LOOK AT BOOK`});
		}
	}
}

class lakeClass extends locationClass {
	constructor() {
		const message = ['Ahhhh the lake. The perfect place for a lengthy walk!'];
		const intro = {size: 0.9, xPos: 0.5, yPos: 1, move: 'back', stop: 0.6, message: message};
		const walkMatrix = {left: 0.05, right: 0.05, back: [0, 0.03, 0.97], front: [0, 0.03, 0.97]};
		const menu = {buttonArrows: 'move', buttonSelect: 'inventory', buttonX: 'talk', buttonStart: 'back to map', buttonB: 'look closer'};
		super('lake1', menu, intro, walkMatrix);
		
		this.introBack = intro;
		this.introRight = {size: 0.4, xPos: -0.16, yPos: 0.46, move: 'right', stop: 0};
		this.introLeft = {size: 0.6, xPos: 1, yPos: 0.5, move: 'left', stop: 0.7};
		
		this.walkMatrix1 = walkMatrix;
		this.walkMatrix2 = {left: 0.05, right: 0.05, back: 'none', front: 'none'};
		this.gameStatus = 'idle';
	}
	
	onEnter() {
		this.conversationStatus = 0;
		this.walkMatrix = this.walkMatrix1;
		this.intro = this.introBack;
		this.location = 'lake1';
	}
	
	checkCollisions(x,y) {
		if (this.location === 'lake1') {
			if (x < -0.16) {
				if (this.gameStatus === 'idle') {
					const root = this;
					setTimeout(function(){
						gameScreen.emtyAll();
						root.walkMatrix = root.walkMatrix2;
						const bbox = gameScreen.loadImage('lake2');
						root.bbox = {width: bbox.width, height: bbox.height, right: bbox.width, bottom: bbox.height};
		
						// place avatar and start intro animation
						root.intro = root.introLeft;
						root.introFinished = false;
						root.walkStatus = root.intro.move;
						avatar.load(root.intro.xPos * root.bbox.width, root.intro.yPos * root.bbox.height, root.intro.size * root.bbox.height);
						avatar.startWalkingAnimation(root.intro.move);
						root.timer = setInterval(root.animateIntro.bind(root), 150);
						root.location = 'lake2';
					}, 100);
				} else if (this.gameStatus === 'failed') {
					gameScreen.emtyAll();
					icecreamGame.enter();
				}
				return true;
			} else if (y > 1) {
				this.leave();
				return true;
			} else if (x < 0.08 && y > 0.49) {
				return true;
			} else if (x > 0.53) {
				return true;
			} else if (x > 0.25 && y < 0.5) {
				return true;
			} else if (y < 0.42) {
				return true;
			}
		} else if (this.location === 'lake2') {
			if (x > 1) {
				const root = this;
				setTimeout(function(){
					gameScreen.emtyAll();
					root.walkMatrix = root.walkMatrix1;
					const bbox = gameScreen.loadImage('lake1');
					root.bbox = {width: bbox.width, height: bbox.height, right: bbox.width, bottom: bbox.height};
		
					// place avatar and start intro animation
					root.intro = root.introRight;
					root.introFinished = false;
					root.walkStatus = root.intro.move;
					avatar.load(root.intro.xPos * root.bbox.width, root.intro.yPos * root.bbox.height, root.intro.size * root.bbox.height);
					avatar.startWalkingAnimation(root.intro.move);
					root.timer = setInterval(root.animateIntro.bind(root), 150);
					root.location = 'lake1';
				}, 100);
				return true;
			} else if (x < 0) {
				return true;
			}
		}
		return false;
	}
	
	otherKeyActions(changes, x, y) {
		if (changes.B === 1) {
			console.log(x,y);
		} else if (this.location === 'lake2' && changes.X === 1 && x < 0.52 && x > 0.2 && this.walkStatus === 'idle' && avatar.currentAvatar === avatar.avatarToBack) {
			
			// Ice cream dialog

			this.dialog0 = {
			    class: 'icecream',
			    start:{ text: "Hey there, what can I get you?", answer1:['Hi, wow so much ice cream!','dialog2'], answer2:['Hi, I want some ice cream!', 'dialog3'],  answer3:[ 'Can I live here??', 'dialog4']},
			    dialog2:{ text:"Thanks, we are proud of our ice cream. Its the best in town!",  answer1:['Lets see. Can I have one?','dialog3'], answer2:['Ok ok I will take a look','dialog3']},
			    dialog3: {text:'Of course, which one?', answer1:['Only chocolate is ice cream, the rest is junk.', 'dialog6'], answer2:['Can I have a chocolate one please?', 'dialog6']},
			    dialog4:{text: 'If you want... but it might be cold duh', answer1:['Worth it!','dialog5'], answer2:['But, so much ice cream!','dialog5'], answer3:['Priorities are important','dialog5']},
			    dialog5: {text:'Sure I guess. Do you want something?', answer1: ['Yes please, a chocolate ice cream', 'dialog6']},
			    dialog6: {text: 'Here...Oh damn! I have to run! If you want the ice cream you need to hurry up and get it around the castle! Bye now.'}
			}
			
			dialog.startDialog(this[`dialog${this.conversationStatus}`], this.dialogEnded.bind(this));
		}
	}
	
	dialogEnded(dialog, answer) {
		gameScreen.emtyAll();
		icecreamGame.enter();
	}
}

class icecreamGameClass {
	constructor() {
	}
	
	enter() {
		gameloop.currentHandler = this;
		avatar.hide();
		lake.intro = lake.introBack;
		menu.setMenu({buttonB: 'press to fly', buttonStart: 'leave'});
		jukebox.playSong('gameMusic');
		gameScreen.loadImage('icecreamGame');
		this.height = 3780;
		this.width = 3023;
		
		this.pipes = [];
		for (let i=1; i < 5; i++) {
			const svg = document.getElementById(`flappyPipes${i}`);
			this.pipes.push({posX: 0, posY: 0, svg: svg});
		}
		this.pipeDistance = 0.5;
		this.pipeSpeed = 0.01;
		
		this.avatar1 = document.getElementById('flappyBird1');
		this.avatar2 = document.getElementById('flappyBird2');
		this.currentAvatar = 1;
		
		this.counter = document.getElementById('floppyCounter');
		
		this.setStartingConditions();
	}
	
	changeAvatar() {
		if (this.currentAvatar === 1) {
			this.avatar1.style.opacity = 0;
			this.avatar2.style.opacity = 1;
			this.currentAvatar = 2;
		} else {
			this.avatar1.style.opacity = 1;
			this.avatar2.style.opacity = 0;
			this.currentAvatar = 1;
		}
	}
	
	setStartingConditions() {
		for (let i=0; i < 4; i++) {
			this.pipes[i].posX = i * this.width * this.pipeDistance;
			this.pipes[i].posY = this.getRandom();
		}
		this.pipesCleared = 0;
		this.nextPipe = 0;
		
		this.avatarPos = 0;
		this.avatarSpeed = 0;
		this.counter.children[0].innerHTML = `Pipes cleared: 0/25`;
		this.timer = setInterval(this.frame.bind(this), 50);
	}
	
	getRandom() {
		return (-0.2 + Math.random() * 0.4) * this.height;
	}
	
	keyPressed(changes) {
		if (changes.B === 1) {
			// flap
			this.changeAvatar();
			this.avatarSpeed = Math.max(this.avatarSpeed - 30, -100);
		} else if (changes.Start === 1) {
			lake.gameStatus = 'failed';
			clearInterval(this.timer);
			gameScreen.emtyAll();
			avatar.show();
			lake.enter();
		}
	}
	
	frame() {
		this.updateAvatar();
		this.updatePipes();
		this.updateSVG();
		this.checkCollision();
	}
	
	updateAvatar() {
		this.avatarSpeed += 2;
		this.avatarPos += this.avatarSpeed;
	}
	
	updatePipes() {
		for (let i = 0; i < 4; i++) {
			this.pipes[i].posX -= this.pipeSpeed * this.width;
			if (this.pipes[i].posX < -1.3 * this.width) {
				if (i === 0) {
					this.pipes[i].posX = this.pipes[3].posX + this.width * this.pipeDistance;
				} else {
					this.pipes[i].posX = this.pipes[i-1].posX + this.width * this.pipeDistance;
				}
				this.pipes[i].posY = this.getRandom();
			}
		}
	}
	
	updateSVG() {
		this.avatar1.setAttribute('transform', `translate(0 ${this.avatarPos})`);
		//this.avatar1.setAttribute('transform', `translate(0 170)`);
		this.avatar2.setAttribute('transform', `translate(0 ${this.avatarPos})`);
		this.pipes.forEach(pipe => {
			pipe.svg.setAttribute('transform', `translate(${pipe.posX} ${pipe.posY})`);
		});
		//this.pipes[3].svg.setAttribute('transform', `translate(-2800 0)`);
	}
	
	checkCollision() {
		const xp = this.pipes[this.nextPipe].posX;
		const yp = this.pipes[this.nextPipe].posY;
		if (xp < -3300) {
			// pipe was cleared
			this.nextPipe = (this.nextPipe + 1) % 4;
			this.pipesCleared++;
			this.counter.children[0].innerHTML = `Pipes cleared: ${this.pipesCleared}/25`;
			if (this.pipesCleared >= 25) {
				this.gameWon();
			}
		} else if (xp < -2800) {
			// check collision
			const dy = Math.abs(yp - this.avatarPos);
			if (dy > 165) {
				this.gameLost();
			}
		}
	}
	
	gameWon() {
		console.log('game won');
		lake.gameStatus = 'won';
		clearInterval(this.timer);
		inventory.addItem('item_icecream');
		setTimeout(function(){
			gameScreen.emtyAll();
			lake.enter();
			avatar.show();
		}, 5000);
	}
	
	gameLost() {
		console.log('game lost');
		jukebox.playSound('floppyFail');
		clearInterval(this.timer);
		const root = this;
		setTimeout(function(){
			root.setStartingConditions();
		}, 1000);
	}
	
}

class christosFlatClass extends locationClass {
	constructor() {
		const message = ['Ohhh, look at my old flat!', ' ', 'This brings up so many memories!'];
		const intro = {size: 0.7, xPos: 1, yPos: 0.5, move: 'left', stop: 0.7, message: message};
		const walkMatrix = {left: 0.04, right: 0.04, back: [0, 0.01, 0.92], front: [0, 0.01, 0.92]};
		const menu = {buttonArrows: 'move', buttonSelect: 'inventory', buttonX: 'talk', buttonStart: 'back to map', buttonB: 'look closer'};
		super('christosFlat', menu, intro, walkMatrix);
	}
	
	onEnter() {
		this.messageShown = false;
	}
	
	checkCollisions(x,y) {
		if (x < 0.47) {
			return true;
		} else if (y < 0.46) {
			if (x < 0.57) {
				if (!this.messageShown) {
					typewriter.showMessage(['I do not think that its wise to go any further!', ' I remember that I set some traps behind the door!']);
				}
				this.messageShown = true;
			}
			return true;
		} else if (x > 1 || y > 1) {
			this.leave();
			return true;
		}
		return false;
	}
	
	otherKeyActions(changes, x, y) {
		if (changes.X === 1) {
			console.log(x,y);
		} else if (changes.B === 1 && x < 0.57 && y < 0.5) {
			inventory.addItem('item_key');
		}
	}
}

class ioannasFlatClass extends locationClass {
	constructor() {
		const message = ['Welcome to Ioannas old flat!'];
		const intro = {size: 0.7, xPos: 1, yPos: 0.5, move: 'left', stop: 0.7, message: message};
		const walkMatrix = {left: 0.04, right: 0.04, back: 'none', front: 'none'};
		const menu = {buttonArrows: 'move', buttonSelect: 'inventory', buttonX: 'talk', buttonStart: 'back to map', buttonB: 'look closer'};
		super('ioannasFlat', menu, intro, walkMatrix);
		this.talkedAlready = false;
	}
	
	onEnter() {
		// check if he has money
		if (inventory.checkForItem('item_key') && this.talkedAlready) {
			this.conversationStatus = 1;
		} else {
			if (this.talkedAlready) {
				this.conversationStatus = 8;
			} else {
				this.conversationStatus = 0;
			}
		}
	}
	
	checkCollisions(x,y) {
		if (x > 1) {
			this.leave();
			return true;
		}
		return false;
	}
	
	otherKeyActions(changes, x, y) {
		if (changes.X === 1) {
			// start talking to Ioanna
			
			// First dialog
			this.dialog0 = {
			    // If he has no key
			    class: 'ioannasFlat',
			    start:{ text: "Who is it?", answer1:['Ela Ioanna, its me','dialog2'], answer2:['Ela re its me, can I come up?', 'dialog2']},
			    dialog2:{ text:"Are you kidding me? Where have you been? amaan",  answer1:['Why? Were you waiting for me?','dialog3'], answer2:['Ti where? I had things to do. Can you open up now?','dialog3']},
			    dialog3: {text:'Christoooo!! You locked me in this morning!', answer1:['Oops sorry... ','dialog4'], answer2:['E whats done is done, sorry.','dialog4']},
			    dialog4:{text: 'I missed my lab course this morning and I had no credit to call anyone!AAAAAA', answer1:['Sorry nte! I will let you out now. Wait, I dont have the key!','dialog5']},
			    dialog5: {text:'OMG go get it! I am in here for 8h... Oh by the way, you forgot your wallet here.'}
			}


			this.dialog1 = {
			    // If he has the key
			    class: 'ioannasFlat',
			    start:{ text: "Yes?", answer1:['Ela I am back','dialog2'], answer2:['Ela re its me, I am coming upstairs', 'dialog2']},
			    dialog2:{ text:"Finally!",  answer1:['Can I also pick up my wallet?','dialog3']},
			    dialog3: {text:'Yes I have it here. There are some cards and stuff in it!'}
			}
			
			this.dialog8 = {
				// not all items but tries again
			   class: 'ioannasFlat',
				start:{ text: "I told you, you locked me in! Go and get my key! Otherwise I will send Margie to hunt you down!"}
			};
			
			dialog.startDialog(this[`dialog${this.conversationStatus}`], this.dialogEnded.bind(this));
		}
	}
	
	dialogEnded(dialog, answer) {
		if (this.conversationStatus === 1) {
			inventory.addItem('item_studentID');
		} else {
			this.talkedAlready = true;
			if (inventory.checkForItem('item_key')) {
				this.conversationStatus = 1;
			} else {
				this.conversationStatus = 8;
			}
		}
	}
}

class centerClass extends locationClass {
	constructor() {
		const message = ['Welcome to Nomarxia!'];
		const intro = {size: 0.7, xPos: 1, yPos: 0.5, move: 'left', stop: 0.7, message: message};
		const walkMatrix = {left: 0.05, right: 0.05, back: 'none', front: 'none'};
		const menu = {buttonArrows: 'move', buttonSelect: 'inventory', buttonX: 'talk', buttonStart: 'back to map', buttonB: 'look closer'};
		super('center1', menu, intro, walkMatrix);
		
		this.introLeft = intro;
		this.introRight = {size: 0.7, xPos: -0.2, yPos: 0.5, move: 'right', stop: 0.1};
		
		this.walkMatrix1 = walkMatrix;
		this.walkMatrix2 = {left: 0.05, right: 0.05, back: [0, 0.01, 0.95], front: [0, 0.01, 0.95]};
		
		this.location = 'center1';
	}
	
	onEnter() {
		// check if he has money
		this.walkMatrix = this.walkMatrix1;
		this.intro = this.introLeft;
		this.location = 'center1';
		if (inventory.checkForItem('item_money')) {
			this.conversationStatus = 1;
		} else  {
			this.conversationStatus = 0;
		}
	}
	
	checkCollisions(x,y) {
		if (this.location === 'center1') {
			if (x < -0.25) {
				const root = this;
				setTimeout(function(){
					gameScreen.emtyAll();
					root.walkMatrix = root.walkMatrix2;
					const bbox = gameScreen.loadImage('center2');
					root.bbox = {width: bbox.width, height: bbox.height, right: bbox.width, bottom: bbox.height};
		
					// place avatar and start intro animation
					root.intro = root.introLeft;
					root.introFinished = false;
					root.walkStatus = root.intro.move;
					avatar.load(root.intro.xPos * root.bbox.width, root.intro.yPos * root.bbox.height, root.intro.size * root.bbox.height);
					avatar.startWalkingAnimation(root.intro.move);
					root.timer = setInterval(root.animateIntro.bind(root), 150);
					root.location = 'center2';
				}, 100);
				return true;
			} else if (x > 1) {
				this.intro = this.introLeft;
				this.leave();
				return true;
			}
		} else if (this.location === 'center2') {
			if (x > 1) {
				const root = this;
				setTimeout(function(){
					gameScreen.emtyAll();
					root.walkMatrix = root.walkMatrix1;
					const bbox = gameScreen.loadImage('center1');
					root.bbox = {width: bbox.width, height: bbox.height, right: bbox.width, bottom: bbox.height};
		
					// place avatar and start intro animation
					root.intro = root.introRight;
					root.introFinished = false;
					root.walkStatus = root.intro.move;
					avatar.load(root.intro.xPos * root.bbox.width, root.intro.yPos * root.bbox.height, root.intro.size * root.bbox.height);
					avatar.startWalkingAnimation(root.intro.move);
					root.timer = setInterval(root.animateIntro.bind(root), 150);
					root.location = 'center1';
				}, 100);
				return true;
			} else if (x < -0.06) {
				return true;
			} else if (y < 0.439) {
				return true;
			}
		}
		
		return false;
	}
	
	otherKeyActions(changes, x, y) {
		if (changes.X === 1 && x > 0.45 && x < 0.65 && y < 0.45 && this.walkStatus === 'idle' && avatar.currentAvatar === avatar.avatarToBack) {
			// talk to kiosk guy
			// First dialog
			this.dialog0 = {
			    // If he has no money
			    class: 'kiosk',
			    start: { text: "Hello, what do you need?", answer1:['Hi, I am not sure... What do you have?','dialog2'], answer2:['Hi, I want a ticket for the bus', 'dialog4']},
			    dialog2: { text:"You have never been to a periptero before? Is this a joke?",  answer1:['No! I am just not sure what I want!','dialog3'], answer2:['Ok ok I will take a look','dialog3']},
			    dialog3: {text:'Decide and come back then!'},
			    dialog4: {text: 'Lucky you, I only have one last ticket and it is a student one! 60 cents.', answer1:['Oh no, I have no money with me...','dialog5'], answer2:['Oops no. Can I get it anyway?','dialog5'], answer3:['Give it to me! The bus is leaving','dialog5']},
			    dialog5: {text:'Get out of here please! This is not a charity'}
			}
			
			this.dialog8 = {
				// not all items but tries again
			   class: 'kiosk',
				start:{ text: "I told you! NO MONEY, NO TICKET! (Clearly in a bad mood)"}
			};

			this.dialog1 = {
			    // If he has money
			    class: 'kiosk',
			    start:{ text: "Yes?", answer1:['Hi there how are you?','dialog2'], answer2:['What a lovely rain today', 'dialog2'],answer2:['I would like a bus ticket please', 'dialog3']},
			    dialog2: { text:"Oh its you again. What do you want?", answer1:['Can I get a ticket?','dialog3'], answer2:['Nothing really. Bye.','end']},
			    dialog3: {text:'I still have it. Here you go.'}
			}
			
			if (!inventory.checkForItem('item_busticket')) {
				dialog.startDialog(this[`dialog${this.conversationStatus}`], this.dialogEnded.bind(this));
			}
		}
	}
	
	dialogEnded(dialog, answer) {
		if (this.conversationStatus === 1) {
			inventory.addItem('item_busticket');
		} else if (this.conversationStatus === 0 && dialog === 'dialog5') {
			this.conversationStatus = 8;
		}
	}
}

class createKeyboard {
	
 	constructor() {
		this.divContainer = document.createElement('div');
	 	this.divContainer.setAttribute('class','keyboard');
	  
		for (let i = 0; i < 26; i++){
			const keyElement = document.createElement('button');
			this.divContainer.append(keyElement);
			keyElement.setAttribute('class','key');
		
			keyElement.innerHTML = String.fromCharCode(65+i);
		}
		document.body.append(this.divContainer);
		this._keySelected = 0;
		this.keySelected = 0;

		this.hide();

	}

	hide() {
		this.divContainer.style.visibility = 'hidden';
	}
	show() {
		this.divContainer.style.visibility = 'visible';
	}
	  
	keyPressed(changes) {
		for (let key in changes) {
			if (key === 'UpDown') {
				if (changes[key] === -1) {
					if (this.keySelected >=10 && this.keySelected <= 25){
						this.keySelected = this.keySelected - 10;
					} else if (this.keySelected <= 5){
						this.keySelected = this.keySelected + 20;
					} else {
						this.keySelected = this.keySelected + 10;
					}
				} else if (changes[key] === 1) {
					if (this.keySelected >=0 && this.keySelected <= 15){
						this.keySelected = this.keySelected + 10;
					} else if (this.keySelected >= 20){
						this.keySelected = this.keySelected - 20;
					} else {
						this.keySelected = this.keySelected - 10;
					}
				}
			} else if (key === 'LeftRight') {
				// left
				if (changes[key] === -1) {
					if ([0, 10, 20].indexOf(this.keySelected) == -1){
						this.keySelected--;
					} else if (this.keySelected == 20){
						this.keySelected = 25;
					} else {
						this.keySelected = this.keySelected + 9;
					}
				//right
				} else if (changes[key] === 1) {
					if ([9, 19, 25].indexOf(this.keySelected) == -1){
						this.keySelected++;

					} else if (this.keySelected == 25){
						this.keySelected = 20;
					} else {
						this.keySelected = this.keySelected - 9;
					}
				}
			} else if (key === 'B' && changes[key] === 1) {
				console.log('select letter')

			} else if (key === 'Start' && changes[key] === 1) {
				console.log('leaving game');
			}
		}
	}
	set keySelected(value){
		 this.divContainer.children[this._keySelected].classList.remove('selected');
		 this._keySelected = value;
		 this.divContainer.children[value].classList.add('selected');
	}
	get keySelected(){
		return this._keySelected;
	}

}

class gameloopClass {
	constructor () {
		// initialize read out for gamepads
		this.gamepads = new gamepadClass();
		this.status = 'wait';
	}
	
	startLoop() {
		setInterval(this.gameFrame.bind(this), 20);
		document.getElementById('startText').innerHTML = 'press any button to start';
	}
	
	gameFrame() {
		this.gamepads.checkGamepads();
		if (this.gamepads.anyChange) {
			if (this.status === 'game') {
				const changes = this.gamepads.changes;
				if (changes.L === 1) {
					document.body.requestFullscreen();
				}
				this.currentHandler.keyPressed(changes);
			} else if (this.status === 'wait') {
				this.status = 'intro';
				document.getElementById('startText').remove();
				document.body.classList.remove('js-loading');
				
				jukebox.playSong('introMusic');
				
				const root = this;
				setTimeout(function(){
					document.getElementById('intro').remove();
					root.status = 'game';
					
					//inventory.addItem('item_busticket');
					//inventory.addItem('item_studentID');
					//inventory.addItem('item_fries');
					//inventory.addItem('item_icecream');
					//inventory.addItem('item_money');
					//inventory.addItem('item_studentID');
					
					//timeStories.enter();
					//
					library.enter();
					//icecreamGame.enter();
					//mcDonalds.enter();
					
				}, 60000);
			}
		}
	}
}

let typewriter = new showMessageClass();
let gameScreen = new gameScreenClass();
let inventory = new inventoryClass();
let menu = new bottomMenuClass();
let avatar = new avatarClass();
let playhouse = new playhouseClass();
let gameloop = new gameloopClass();
let keyboard = new createKeyboard();

let timeStories = new timeStoriesClass();
let mcDonalds = new mcDonaldsClass();
let busStop = new busStopClass();
let library = new libraryClass();
let center = new centerClass();
let lake = new lakeClass();
let christosFlat = new christosFlatClass();
let ioannasFlat = new ioannasFlatClass();

let friesGame = new friesGameClass();
let icecreamGame = new icecreamGameClass();

let map = new mapClass();
let jukebox = new musicLibrary();
let dialog = new dialogClass();
let quiz = new quizClass();

window.addEventListener("load", initializeGame);

function initializeGame() {
	avatar.init();
	gameloop.startLoop();
}