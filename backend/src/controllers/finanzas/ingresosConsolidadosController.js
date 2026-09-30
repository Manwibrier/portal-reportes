const pool = require('../../config/database'); 

const getIngresosConsolidados = async (req, res) => {
    try {
        const query = `SELECT * FROM powerbi.ingreso_consolidado`;
        const { rows } = await pool.query(query);
        
        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error al obtener ingresos consolidados:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al procesar la solicitud de ingresos' 
        });
    }
};

module.exports = { getIngresosConsolidados };
