

interface Licensed {
    plateId: string;
}

abstract class Vehicle {
    capacity: number;
    weight: number;

    moveTo(x: Number, y: Number) {};
    abstract hasWheel() : boolean;
}

class Car extends Vehicle implements Licensed {
    plateId: string;

    constructor(plateId) {
        super();
        this.plateId = plateId;
    }

    hasWheel() {
        return true;
    }
}

class DirtBike {
    hasWheel() {
        return true;
    }
}

class Plane extends Vehicle implements Licensed {
    plateId = "ADK";
    
    hasWheel() {
        return false;
    }
}