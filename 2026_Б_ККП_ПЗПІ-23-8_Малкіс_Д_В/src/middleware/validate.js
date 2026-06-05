const validateRegistration = (req, res, next) => {
    const { email, password, name } = req.body;
    const errors = [];
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Введіть коректний email');
    }
    
    if (!password || password.length < 6) {
        errors.push('Пароль має бути не менше 6 символів');
    }
    
    if (!name || name.trim().length === 0) {
        errors.push('Введіть ім\'я');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }
    
    next();
};

const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Введіть коректний email');
    }
    
    if (!password) {
        errors.push('Введіть пароль');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }
    
    next();
};

const validateVehicle = (req, res, next) => {
    const { plate_number, type, model, year } = req.body;
    const errors = [];
    
    if (!plate_number || plate_number.trim().length === 0) {
        errors.push('Введіть номерний знак');
    } else if (!/^[A-Za-z0-9]+$/.test(plate_number)) {
        errors.push('Номерний знак має містити тільки латинські літери та цифри');
    }
    
    if (!type || type.trim().length === 0) {
        errors.push('Введіть тип транспорту');
    }
    
    if (!model || model.trim().length === 0) {
        errors.push('Введіть модель транспорту');
    }
    
    const yearNum = parseInt(year);
    const currentYear = new Date().getFullYear();
    
    if (!year || isNaN(yearNum)) {
        errors.push('Введіть коректний рік виробництва');
    } else if (yearNum < 1900 || yearNum > currentYear + 1) {
        errors.push(`Рік виробництва має бути між 1900 та ${currentYear + 1}`);
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    req.validatedData = {
        plate_number: plate_number.trim().toUpperCase(),
        type: type.trim(),
        model: model.trim(),
        year: yearNum
    };


const validateRegistration = (req, res, next) => {
    const { email, password, name } = req.body;
    const errors = [];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Введіть коректний email');
    }

    if (!password || password.length < 6) {
        errors.push('Пароль має бути не менше 6 символів');
    }

    if (!name || name.trim().length === 0) {
        errors.push('Введіть ім\'я');
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};

const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Введіть коректний email');
    }

    if (!password) {
        errors.push('Введіть пароль');
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};

const validateVehicle = (req, res, next) => {
    const { plate_number, type, model, year } = req.body;
    const errors = [];

    if (!plate_number || plate_number.trim().length === 0) {
        errors.push('Введіть номерний знак');
    } else if (!/^[A-Za-z0-9]+$/.test(plate_number)) {
        errors.push('Номерний знак має містити тільки латинські літери та цифри');
    }

    if (!type || type.trim().length === 0) {
        errors.push('Введіть тип транспорту');
    }

    if (!model || model.trim().length === 0) {
        errors.push('Введіть модель транспорту');
    }

    const yearNum = parseInt(year);
    const currentYear = new Date().getFullYear();

    if (!year || isNaN(yearNum)) {
        errors.push('Введіть коректний рік виробництва');
    } else if (yearNum < 1900 || yearNum > currentYear + 1) {
        errors.push(`Рік виробництва має бути між 1900 та ${currentYear + 1}`);
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    req.validatedData = {
        plate_number: plate_number.trim().toUpperCase(),
        type: type.trim(),
        model: model.trim(),
        year: yearNum
    };

    next();
};

module.exports = {
    validateRegistration,
    validateLogin,
    validateVehicle
};

    
    next();
};

const handleValidation = (req, res, next) => {
    next();
};

module.exports = {
    validateRegistration,
    validateLogin,
    validateVehicle,
    handleValidation
};