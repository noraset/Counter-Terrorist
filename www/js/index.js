// Phaser Tower Defense (simple demo)
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload,
        create,
        update
    }
};

const game = new Phaser.Game(config);
let debugGraphics;
let enemies = [];
let towers = [];
let bullets;
let pathPoints = [
    { x: 0, y: 300 },
    { x: 200, y: 300 },
    { x: 200, y: 500 },
    { x: 600, y: 500 },
    { x: 600, y: 100 },
    { x: 800, y: 100 }
];
let towerSpots = [
    { x: 150, y: 200 },
    { x: 350, y: 400 },
    { x: 500, y: 200 },
    { x: 700, y: 400 }
];
let score = 0;
let scoreText;
let collisionParticles;
let collisionEmitterManager;
function preload() {
    this.load.image('enemy', 'assets/Monster/1/1.png');
    // Preload walk animation frames for enemy
    for (let i = 1; i <= 4; i++) {
        this.load.image('enemy_walk_' + i, 'assets/Monster/1/' + i + '.png');
    }
    this.load.image('tower', 'assets/Guns/1g.png');
    this.load.image('bullet', 'assets/Bullets/Bullets3.png');
    this.load.image('collision', 'assets/Colision Sprites/1.png');
}

function create() {
    // Draw path
    const g = this.add.graphics();
    g.lineStyle(8, 0xaaaaaa, 1);
    g.beginPath();
    g.moveTo(pathPoints[0].x, pathPoints[0].y);
    for (let i = 1; i < pathPoints.length; i++) {
        g.lineTo(pathPoints[i].x, pathPoints[i].y);
    }
    g.strokePath();

    // Draw tower spots
    towerSpots.forEach(pt => {
        g.lineStyle(2, 0x00ff00, 1);
        g.strokeRect(pt.x - 25, pt.y - 25, 50, 50);
    });

    // Place towers on click
    this.input.on('pointerdown', pointer => {
        const spot = towerSpots.find(pt => Phaser.Math.Distance.Between(pt.x, pt.y, pointer.worldX, pointer.worldY) < 25);
        if (spot && !spot.hasTower) {
            const tower = this.physics.add.sprite(spot.x, spot.y, 'tower');
            tower.setImmovable(true);
            tower.lastShot = 0;
            towers.push(tower);
            spot.hasTower = true;
        }
    });

    debugGraphics = this.add.graphics();
    debugGraphics.setDepth(1000); // Draw on top

    // Group for bullets
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 20
    });

    // Create walk animation for enemy
    this.anims.create({
        key: 'enemy_walk',
        frames: [
            { key: 'enemy_walk_1' },
            { key: 'enemy_walk_2' },
            { key: 'enemy_walk_3' },
            { key: 'enemy_walk_4' }
        ],
        frameRate: 8,
        repeat: -1
    });

    // Enemy spawn timer
    this.time.addEvent({
        delay: 1500,
        loop: true,
        callback: () => {
            const enemy = this.physics.add.sprite(pathPoints[0].x, pathPoints[0].y, 'enemy_walk_1');
            enemy.setActive(true);
            enemy.setVisible(true);
            enemy.body.enable = true;
            enemy.pathIndex = 1;
            enemy.speed = 60;
            enemy.anims.play('enemy_walk');
            enemies.push(enemy);
        }
    });

    scoreText = this.add.text(16, 16, 'Score: 0', {
        fontSize: '24px',
        fill: '#ffffff',
        fontFamily: 'Arial'
    });

    // Draw green box around enemies (clear at start)
    debugGraphics.clear();
    debugGraphics.lineStyle(2, 0x00ff00, 1);

    // Particle manager for collision effect
    collisionEmitterManager = this.add.particles('collision'); // แบบใหม่ใน v3.60+
     
    this.physics.add.overlap(bullets, enemies, (bullet, enemy) => {
        if (!bullet.active || !enemy.active) return;

        bullet.destroy();

        // ใช้ Emitter แบบใหม่
        const emitter = collisionEmitterManager.createEmitter({
            x: enemy.x,
            y: enemy.y,
            speed: { min: -200, max: 200 },
            scale: { start: 0.5, end: 0 },
            lifespan: 200,
            quantity: 12
        });

        // หยุด emitter หลังจากแสดงแล้ว
        this.time.delayedCall(200, () => {
            emitter.stop();
            emitter.remove(); // ล้าง emitter ที่สร้างไว้
        });

        enemy.destroy();
        score += 1;
        scoreText.setText('Score: ' + score);
    }, null, this);
}

function update(time, delta) {
    // Move enemies along path
    enemies.forEach(enemy => {
        if (!enemy.active) return;
        const target = pathPoints[enemy.pathIndex];
        if (!target) {
            enemy.destroy(); // Reached end
            return;
        }
        // Set angle to face direction
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, target.x, target.y);
        enemy.setAngle(Phaser.Math.RadToDeg(angle) - 90);
        // Play walk animation if not already
        if (!enemy.anims.isPlaying) enemy.anims.play('enemy_walk');
        this.physics.moveTo(enemy, target.x, target.y, enemy.speed);
        if (Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y) < 4) {
            enemy.pathIndex++;
        }
    });
    // Remove destroyed enemies from array
    enemies = enemies.filter(e => e.active);

    // Towers shoot at enemies in range and rotate to face target
    towers.forEach(tower => {
        if (time < tower.lastShot + 500) return;
        const target = enemies.find(e => e.active && Phaser.Math.Distance.Between(tower.x, tower.y, e.x, e.y) < 180);
        if (target) {
            // Rotate tower to face target
            const angle = Phaser.Math.Angle.Between(tower.x, tower.y, target.x, target.y);
            tower.setAngle(Phaser.Math.RadToDeg(angle) - 90);
            const bullet = bullets.create(tower.x, tower.y, 'bullet');
            bullet.setActive(true);
            bullet.setVisible(true);
            bullet.body.enable = true;
            bullet.setCollideWorldBounds(false);
            this.physics.moveTo(bullet, target.x, target.y, 400);
            bullet.lifespan = 1000;
            bullet.setAngle(Phaser.Math.RadToDeg(angle) - 90);
            tower.lastShot = time;
        }
    });
    // Destroy bullets after lifespan
    bullets.getChildren().forEach(bullet => {
        bullet.lifespan -= delta;
        if (bullet.lifespan <= 0) bullet.destroy();
    });

    // Draw green box around enemies
    debugGraphics.clear();
    debugGraphics.lineStyle(2, 0x00ff00, 1);
    enemies.forEach((enemy, idx) => {
        if (!enemy.active) return;
        debugGraphics.strokeRect(
            enemy.body.x,
            enemy.body.y,
            enemy.body.width,
            enemy.body.height
        );
    });

    // Clean up bullets that go off screen (use world bounds)
    bullets.getChildren().forEach(bullet => {
        if (!bullet.active) return;
        if (
            bullet.x < 0 || bullet.x > config.width ||
            bullet.y < 0 || bullet.y > config.height
        ) {
            bullet.destroy();
        }
    });
}