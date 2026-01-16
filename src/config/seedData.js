import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const seedDatabase = async () => {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sacc5i_db'
    });

    console.log('🔄 Iniciando carga de datos reales del C5i...\n');

    // ============================================
    // 1. REGIONES (9 regiones reales)
    // ============================================
    console.log('📦 Cargando Regiones...');
    const regiones = [
      { nombre: 'Huejotzingo', total: 16 },
      { nombre: 'Izúcar', total: 52 },
      { nombre: 'Cuapiaxtla de Madero', total: 24 },
      { nombre: 'Libres', total: 14 },
      { nombre: 'Puebla', total: 10 },
      { nombre: 'Tehuacán', total: 27 },
      { nombre: 'Teziutlán', total: 29 },
      { nombre: 'Zacatlán', total: 33 },
      { nombre: 'Palmar de Bravo', total: 12 }
    ];

    for (const region of regiones) {
      await connection.query(
        'INSERT IGNORE INTO regiones (nombre, total_municipios) VALUES (?, ?)',
        [region.nombre, region.total]
      );
    }
    console.log(`✅ ${regiones.length} regiones cargadas`);

    // ============================================
    // 2. MUNICIPIOS CON CLAVES OFICIALES
    // ============================================
    console.log('🏘️  Cargando Municipios con claves oficiales...');
    
    const municipiosPorRegion = {
      'Huejotzingo': [
        [26, 'Calpan'], [48, 'Chiautzingo'], [60, 'Domingo Arenas'], [74, 'Huejotzingo'],
        [90, 'Juan C. Bonilla'], [102, 'Nealtican'], [122, 'San Felipe Teotlalcingo'],
        [126, 'San Jerónimo Tecuanipan'], [132, 'San Martín Texmelucan'], [134, 'San Matías Tlalancaleca'],
        [136, 'San Miguel Xoxtla'], [138, 'San Nicolás de los Ranchos'], [143, 'San Salvador El Verde'],
        [175, 'Tianguismanalco'], [180, 'Tlahuapan'], [181, 'Tlaltenango']
      ],
      'Izúcar': [
        [3, 'Acatlán de Osorio'], [5, 'Acteopan'], [7, 'Ahuatlán'], [9, 'Ahuehuetitla'],
        [11, 'Albino Zertuche'], [21, 'Atzala'], [22, 'Atzitzihuacan'], [24, 'Axutla'],
        [47, 'Chiautla'], [51, 'Chietla'], [52, 'Chigmecatitlán'], [55, 'Chila'],
        [56, 'Chila de la Sal'], [59, 'Chinantla'], [31, 'Coatzingo'], [32, 'Cohetzala'],
        [33, 'Cohuecan'], [42, 'Cuayuca de Andrade'], [62, 'Epatlán'], [66, 'Guadalupe'],
        [69, 'Huaquechula'], [70, 'Huatlatlauca'], [73, 'Huehuetlan El Chico'], [150, 'Huehuetlan El Grande'],
        [81, 'Ixcamilpa de Guerrero'], [85, 'Izucar de Matamoros'], [87, 'Jolalpan'], [95, 'Magdalena Tlatlauquitepec'],
        [112, 'Petlalcingo'], [113, 'Piaxtla'], [121, 'San Diego La Mesa Tochimiltzingo'], [127, 'San Jeronimo Xayacatlan'],
        [133, 'San Martin Totoltepec'], [135, 'San Miguel Ixitlán'], [139, 'San Pablo Anicano'], [141, 'San Pedro Yeloixtlahuaca'],
        [146, 'Santa Catarina Tlaltempa'], [155, 'Tecomatlán'], [157, 'Tehuitzingo'], [159, 'Teopantlan'],
        [160, 'Teotlalco'], [165, 'Tepemaxalco'], [166, 'Tepeojuma'], [168, 'Tepexco'],
        [176, 'Tilapa'], [185, 'Tlapanalá'], [190, 'Totoltepec de Guerrero'], [191, 'Tulcingo'],
        [196, 'Xayacatlán De Bravo'], [198, 'Xicotlán'], [201, 'Xochiltepec'], [206, 'Zacapala']
      ],
      'Cuapiaxtla de Madero': [
        [1, 'Acajete'], [4, 'Acatzingo'], [15, 'Amozoc'], [20, 'Atoyatempan'],
        [38, 'Cuapiaxtla de Madero'], [40, 'Cuautinchan'], [79, 'Huitziltepec'], [97, 'Mixtla'],
        [115, 'Quecholac'], [118, 'Reyes de Juárez'], [131, 'San Juan Atzompa'], [144, 'San Salvador Huixcolotla'],
        [147, 'Santa Inés Ahuatempan'], [151, 'Santo Tomas Hueyotlipan'], [153, 'Tecali de Herrera'], [154, 'Tecamachalco'],
        [163, 'Tepatlaxco de Hidalgo'], [164, 'Tepeaca'], [171, 'Tepeyahualco de Cuauhtémoc'], [182, 'Tlanepantla'],
        [189, 'Tochtepec'], [193, 'Tzicatlacoyan'], [203, 'Xochitlán Todos Santos'], [205, 'Yehualtepec']
      ],
      'Libres': [
        [50, 'Chichiquila'], [58, 'Chilchotla'], [44, 'Cuyoaco'], [67, 'Guadalupe Victoria'],
        [83, 'Ixtacamaxtitlán'], [93, 'Lafragua'], [94, 'Libres'], [104, 'Nopalucan'],
        [105, 'Ocotepec'], [108, 'Oriental'], [116, 'Quimixtlán'], [117, 'Rafael Lara Grajales'],
        [128, 'San Jose Chiapa'], [170, 'Tepeyahualco']
      ],
      'Puebla': [
        [19, 'Atlixco'], [34, 'Coronango'], [41, 'Cuautlancingo'], [106, 'Ocoyucan'],
        [119, 'San Andrés Cholula'], [125, 'San Gregorio Atzompa'], [140, 'San Pedro Cholula'],
        [148, 'Santa Isabel Cholula'], [188, 'Tochimilco'], [114, 'Puebla']
      ],
      'Tehuacán': [
        [10, 'Ajalpan'], [13, 'Altepexi'], [18, 'Atexcal'], [27, 'Caltepec'],
        [99, 'Cañada Morelos'], [46, 'Chapulco'], [35, 'Coxcatlán'], [36, 'Coyomeapan'],
        [37, 'Coyotepec'], [61, 'Eloxochitlán'], [82, 'Ixcaquixtla'], [92, 'Juan N. Mendez'],
        [98, 'Molcaxac'], [103, 'Nicolas Bravo'], [120, 'San Antonio Cañada'], [124, 'San Gabriel Chilac'],
        [129, 'San Jose Miahuatlán'], [145, 'San Sebastián Tlacotepec'], [149, 'Santiago Miahuatlán'], [156, 'Tehuacán'],
        [161, 'Tepanco de Lopez'], [169, 'Tepexi de Rodríguez'], [177, 'Tlacotepec De Benito Juarez'], [195, 'Vicente Guerrero'],
        [209, 'Zapotitlán'], [214, 'Zinacatepec'], [217, 'Zoquitlán']
      ],
      'Teziutlán': [
        [2, 'Acateno'], [17, 'Atempan'], [80, 'Atlequizayan'], [25, 'Ayotoxco de Guerrero'],
        [29, 'Caxhuacan'], [54, 'Chignautla'], [43, 'Cuetzalan del Progreso'], [72, 'Huehuetla'],
        [75, 'Hueyapan'], [76, 'Hueytamalco'], [78, 'Huitzilan de Serdán'], [84, 'Ixtepec'],
        [88, 'Jonotla'], [101, 'Nauzontla'], [158, 'Tenampulco'], [173, 'Tetéles de Ávila Castillo'],
        [174, 'Teziutlán'], [186, 'Tlatlauquitepec'], [192, 'Tuzamapan de Galeana'], [199, 'Xiutetelco'],
        [200, 'Xochiapulco'], [202, 'Xochitlán de Vicente Suárez'], [204, 'Yaonáhuac'], [207, 'Zacapoaxtla'],
        [210, 'Zapotitlán de Méndez'], [211, 'Zaragoza'], [212, 'Zautla'], [215, 'Zongozotla'],
        [216, 'Zoquiapan']
      ],
      'Zacatlán': [
        [6, 'Ahuacatlan'], [8, 'Ahuazotepec'], [14, 'Amixtlán'], [16, 'Aquixtla'],
        [28, 'Camocuautla'], [49, 'Chiconcuautla'], [53, 'Chignahuapan'], [30, 'Coatepec'],
        [39, 'Cuautempan'], [64, 'Francisco Z. Mena'], [68, 'Hermenegildo Galeana'], [57, 'Honey'],
        [71, 'Huauchinango'], [77, 'Hueytlalpan'], [86, 'Jalpan'], [89, 'Jopala'],
        [91, 'Juan Galindo'], [100, 'Naupan'], [107, 'Olintla'], [109, 'Pahuatlan'],
        [111, 'Pantepec'], [123, 'San Felipe Tepatlán'], [162, 'Tepango de Rodríguez'], [167, 'Tepetzintla'],
        [172, 'Tetela de Ocampo'], [178, 'Tlacuilotepec'], [183, 'Tlaola'], [184, 'Tlapacoya'],
        [187, 'Tlaxco'], [194, 'Venustiano Carranza'], [197, 'Xicotepec'], [208, 'Zacatlán'],
        [213, 'Zihuateutla']
      ],
      'Palmar de Bravo': [
        [12, 'Aljojuca'], [23, 'Atzitzintla'], [45, 'Chalchicomula de Sesma'], [63, 'Esperanza'],
        [65, 'General Felipe Ángeles'], [96, 'Mazapiltepec de Juarez'], [110, 'Palmar de Bravo'], [130, 'San Juan Atenco'],
        [137, 'San Nicolas Buenos Aires'], [142, 'San Salvador El Seco'], [152, 'Soltepec'], [179, 'Tlachichuca']
      ]
    };

    for (const [regionNombre, municipios] of Object.entries(municipiosPorRegion)) {
      const [regionResult] = await connection.query(
        'SELECT id FROM regiones WHERE nombre = ?',
        [regionNombre]
      );
      
      const regionId = regionResult[0].id;
      
      for (const [clave, nombre] of municipios) {
        await connection.query(
          'INSERT IGNORE INTO municipios (clave, nombre, region_id) VALUES (?, ?, ?)',
          [clave, nombre, regionId]
        );
      }
    }
    console.log('✅ Todos los municipios cargados con sus claves oficiales');

    // ============================================
    // 3. USUARIOS REALES DEL C5i
    // ============================================
    console.log('👥 Cargando usuarios reales...');
    
    // Obtener IDs de regiones para asignación
    const [regionesDB] = await connection.query('SELECT id, nombre FROM regiones');
    const regionMap = {};
    regionesDB.forEach(r => regionMap[r.nombre] = r.id);

    const usuarios = [
      // SUPER ADMIN PRINCIPAL (Orlando)
      {
        nombre: 'Orlando',
        apellido: 'Developer',
        usuario: 'orla_developer',
        password: await bcrypt.hash('Orlando2026!', 10),
        extension: null,
        region_id: null,
        rol: 'super_admin',
        password_changed: true
      },
      {
        nombre: 'Dev',
        apellido: 'Sistema',
        usuario: 'dev_sistema',
        password: await bcrypt.hash('DevSistema2026!', 10),
        extension: null,
        region_id: null,
        rol: 'super_admin',
        password_changed: true
      },
      
      // ADMIN (Leslie - Gerencia C5)
      {
        nombre: 'Leslie',
        apellido: 'C5',
        usuario: 'leslie_admin',
        password: await bcrypt.hash('10000', 10),
        extension: '10000',
        region_id: null,
        rol: 'admin',
        password_changed: false
      },
      
      // ANALISTAS (Operativos reales)
      {
        nombre: 'Belén',
        apellido: 'Rodríguez Marín',
        usuario: 'belen_rodriguez',
        password: await bcrypt.hash('11020', 10),
        extension: '11020',
        region_id: regionMap['Izúcar'],
        rol: 'analista',
        password_changed: false
      },
      {
        nombre: 'María de Jesús',
        apellido: 'Palacios Meza',
        usuario: 'maria_palacios',
        password: await bcrypt.hash('17025', 10),
        extension: '17025',
        region_id: regionMap['Cuapiaxtla de Madero'],
        rol: 'analista',
        password_changed: false
      },
      {
        nombre: 'Elsa Cristina',
        apellido: 'Castillo Reyes',
        usuario: 'elsa_castillo',
        password: await bcrypt.hash('41025', 10),
        extension: '41025',
        region_id: regionMap['Libres'],
        rol: 'analista',
        password_changed: false
      },
      {
        nombre: 'Jose Alberto',
        apellido: 'Vázquez Hernández',
        usuario: 'jose_vazquez',
        password: await bcrypt.hash('10029', 10),
        extension: '10029',
        region_id: regionMap['Puebla'],
        rol: 'analista',
        password_changed: false
      },
      {
        nombre: 'Guadalupe',
        apellido: 'Serrano Cortés',
        usuario: 'guadalupe_serrano',
        password: await bcrypt.hash('43025', 10),
        extension: '43025',
        region_id: regionMap['Tehuacán'],
        rol: 'analista',
        password_changed: false
      },
      {
        nombre: 'Jaime',
        apellido: 'Fernández Juárez',
        usuario: 'jaime_fernandez',
        password: await bcrypt.hash('12025', 10),
        extension: '12025',
        region_id: regionMap['Teziutlán'],
        rol: 'analista',
        password_changed: false
      },
      {
        nombre: 'Alejandro',
        apellido: 'Domínguez Domínguez',
        usuario: 'alejandro_dominguez',
        password: await bcrypt.hash('42025', 10),
        extension: '42025',
        region_id: regionMap['Zacatlán'],
        rol: 'analista',
        password_changed: false
      },
      {
        nombre: 'Analista',
        apellido: 'Huejotzingo',
        usuario: 'analista_huejotzingo',
        password: await bcrypt.hash('10027', 10),
        extension: '10027',
        region_id: regionMap['Huejotzingo'],
        rol: 'analista',
        password_changed: false
      },
      {
        nombre: 'Analista',
        apellido: 'Palmar',
        usuario: 'analista_palmar',
        password: await bcrypt.hash('00000', 10),
        extension: '00000',
        region_id: regionMap['Palmar de Bravo'],
        rol: 'analista',
        password_changed: false
      }
    ];

    for (const user of usuarios) {
      await connection.query(
        `INSERT INTO usuarios (nombre, apellido, usuario, password, extension, region_id, rol, password_changed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         nombre = VALUES(nombre),
         apellido = VALUES(apellido),
         password = VALUES(password),
         extension = VALUES(extension),
         region_id = VALUES(region_id),
         rol = VALUES(rol),
         password_changed = VALUES(password_changed)`,
        [user.nombre, user.apellido, user.usuario, user.password, user.extension, user.region_id, user.rol, user.password_changed]
      );
    }
    console.log(`✅ ${usuarios.length} usuarios cargados`);

    // ============================================
    // 4. TIPOS DE OFICIO
    // ============================================
    console.log('📋 Cargando tipos de oficio...');
    const tiposOficio = [
      ['Alta', 'Solicitud de alta en el sistema'],
      ['Baja', 'Solicitud de baja del sistema'],
      ['Consulta', 'Consulta de información'],
      ['Modificación', 'Modificación de datos'],
      ['Reporte', 'Reporte de incidencia'],
      ['Queja', 'Queja ciudadana'],
      ['Sugerencia', 'Sugerencia de mejora']
    ];

    for (const [nombre, descripcion] of tiposOficio) {
      await connection.query(
        'INSERT IGNORE INTO tipos_oficio (nombre, descripcion) VALUES (?, ?)',
        [nombre, descripcion]
      );
    }
    console.log('✅ Tipos de oficio cargados');

    // ============================================
    // 5. ESTATUS DE SOLICITUDES
    // ============================================
    console.log('🎨 Cargando estatus...');
    const estatus = [
      ['Pendiente', 'Solicitud recibida, pendiente de revisión', '#FFA500'],
      ['En Proceso', 'Solicitud en proceso de atención', '#2196F3'],
      ['En Revisión', 'Solicitud en revisión por supervisor', '#FF9800'],
      ['Aprobada', 'Solicitud aprobada', '#4CAF50'],
      ['Rechazada', 'Solicitud rechazada', '#F44336'],
      ['Completada', 'Solicitud completada exitosamente', '#8BC34A'],
      ['Cancelada', 'Solicitud cancelada por el usuario', '#9E9E9E']
    ];

    for (const [nombre, descripcion, color] of estatus) {
      await connection.query(
        'INSERT IGNORE INTO estatus_solicitudes (nombre, descripcion, color) VALUES (?, ?, ?)',
        [nombre, descripcion, color]
      );
    }
    console.log('✅ Estatus cargados');

    console.log('\n🎉 ¡Carga de datos completada exitosamente!\n');
    console.log('📊 Resumen:');
    console.log(`   - 9 Regiones`);
    console.log(`   - 217 Municipios con claves oficiales`);
    console.log(`   - ${usuarios.length} Usuarios (2 Super Admins, 1 Admin, ${usuarios.length - 3} Analistas)`);
    console.log(`   - 7 Tipos de Oficio`);
    console.log(`   - 7 Estatus de Solicitudes\n`);

  } catch (error) {
    console.error('❌ Error al cargar datos:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedDatabase;
