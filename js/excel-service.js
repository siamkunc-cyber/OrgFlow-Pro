/**
 * Excel Service for Org Chart
 * Handles Excel template creation, file parsing, validation, and exporting
 */
class ExcelService {
  /**
   * Column synonyms mapping for smart auto-detection
   */
  static COLUMN_MAP = {
    id: ['id', 'ID', 'Id', 'รหัส', 'รหัสพนักงาน', 'employee_id', 'employee id', 'empid', 'emp_id'],
    name: ['name', 'Name', 'fullname', 'full name', 'ชื่อ', 'ชื่อ-นามสกุล', 'ชื่อพนักงาน', 'ชื่อ นามสกุล', 'employee_name'],
    position: ['position', 'Position', 'title', 'Title', 'job_title', 'ตำแหน่ง', 'ตำแหน่งงาน', 'หน้าที่'],
    department: ['department', 'Department', 'dept', 'Dept', 'ฝ่าย', 'แผนก', 'สังกัด', 'หน่วยงาน', 'team', 'Team'],
    reportsTo: ['reportsto', 'reportsTo', 'ReportsTo', 'reports_to', 'managerid', 'managerId', 'ManagerID', 'manager_id', 'parentid', 'parentId', 'ParentID', 'หัวหน้า', 'รหัสหัวหน้า', 'ผู้บังคับบัญชา'],
    roleLevel: ['rolelevel', 'roleLevel', 'RoleLevel', 'role_level', 'level', 'Level', 'ระดับ', 'ขั้น'],
    email: ['email', 'Email', 'e-mail', 'E-mail', 'อีเมล', 'mail'],
    phone: ['phone', 'Phone', 'telephone', 'mobile', 'เบอร์โทร', 'เบอร์โทรศัพท์', 'โทรศัพท์', 'tel'],
    avatarUrl: ['avatarurl', 'avatarUrl', 'AvatarURL', 'avatar', 'Avatar', 'photo', 'Photo', 'image', 'Image', 'รูป', 'รูปภาพ', 'รูปโปรไฟล์']
  };

  /**
   * Download pre-configured Excel Template with demo data and notes
   */
  static downloadTemplate() {
    if (typeof XLSX === 'undefined') {
      console.error('SheetJS (XLSX) is not loaded');
      return;
    }

    const templateData = [
      {
        "ID (รหัสพนักงาน)": "EMP001",
        "Name (ชื่อ-นามสกุล)": "ดร. สมชาย สุขเกษม",
        "Position (ตำแหน่ง)": "Chief Executive Officer (CEO)",
        "Department (แผนก/ฝ่าย)": "Executive Board",
        "ReportsTo (รหัสหัวหน้า)": "",
        "RoleLevel (ระดับตำแหน่ง)": "C-Level",
        "Email (อีเมล)": "somchai.s@company.co.th",
        "Phone (เบอร์โทร)": "081-234-5678",
        "AvatarURL (ลิงก์รูปภาพ)": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
      },
      {
        "ID (รหัสพนักงาน)": "EMP002",
        "Name (ชื่อ-นามสกุล)": "กิตติพงษ์ วิริยะกุล",
        "Position (ตำแหน่ง)": "Chief Technology Officer (CTO)",
        "Department (แผนก/ฝ่าย)": "Technology",
        "ReportsTo (รหัสหัวหน้า)": "EMP001",
        "RoleLevel (ระดับตำแหน่ง)": "C-Level",
        "Email (อีเมล)": "kittipong.v@company.co.th",
        "Phone (เบอร์โทร)": "082-345-6789",
        "AvatarURL (ลิงก์รูปภาพ)": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
      },
      {
        "ID (รหัสพนักงาน)": "EMP003",
        "Name (ชื่อ-นามสกุล)": "พิมลดา รัตนโชติ",
        "Position (ตำแหน่ง)": "Chief Marketing Officer (CMO)",
        "Department (แผนก/ฝ่าย)": "Marketing",
        "ReportsTo (รหัสหัวหน้า)": "EMP001",
        "RoleLevel (ระดับตำแหน่ง)": "C-Level",
        "Email (อีเมล)": "pimonlada.r@company.co.th",
        "Phone (เบอร์โทร)": "083-456-7890",
        "AvatarURL (ลิงก์รูปภาพ)": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
      },
      {
        "ID (รหัสพนักงาน)": "EMP004",
        "Name (ชื่อ-นามสกุล)": "วรเมธ ปัญญางาม",
        "Position (ตำแหน่ง)": "Head of Engineering",
        "Department (แผนก/ฝ่าย)": "Technology",
        "ReportsTo (รหัสหัวหน้า)": "EMP002",
        "RoleLevel (ระดับตำแหน่ง)": "Director",
        "Email (อีเมล)": "worameth.p@company.co.th",
        "Phone (เบอร์โทร)": "086-789-0123",
        "AvatarURL (ลิงก์รูปภาพ)": ""
      },
      {
        "ID (รหัสพนักงาน)": "EMP005",
        "Name (ชื่อ-นามสกุล)": "ชานนท์ สิทธิผล",
        "Position (ตำแหน่ง)": "Senior Fullstack Developer",
        "Department (แผนก/ฝ่าย)": "Technology",
        "ReportsTo (รหัสหัวหน้า)": "EMP004",
        "RoleLevel (ระดับตำแหน่ง)": "Staff",
        "Email (อีเมล)": "chanon.s@company.co.th",
        "Phone (เบอร์โทร)": "088-901-2345",
        "AvatarURL (ลิงก์รูปภาพ)": ""
      }
    ];

    const instructionData = [
      { "คำแนะนำการกรอกข้อมูล": "1. คอลัมน์ ID (รหัสพนักงาน) : ห้ามเว้นว่าง และห้ามซ้ำกันโดยเด็ดขาด" },
      { "คำแนะนำการกรอกข้อมูล": "2. คอลัมน์ ReportsTo (รหัสหัวหน้า) : ให้ใส่ 'ID' ของหัวหน้าสายตรง (หากเป็นตำแหน่งสูงสุดขององค์กรให้เว้นว่างไว้)" },
      { "คำแนะนำการกรอกข้อมูล": "3. คอลัมน์ Department : แผนกหรือฝ่าย ระบบจะแยกสีตามแผนกให้อัตโนมัติ" },
      { "คำแนะนำการกรอกข้อมูล": "4. คอลัมน์ RoleLevel : ระดับตำแหน่ง เช่น C-Level, Director, Manager, Staff" },
      { "คำแนะนำการกรอกข้อมูล": "5. คอลัมน์ AvatarURL : ลิงก์รูปโปรไฟล์ (หากไม่มี ระบบจะสร้างไอคอนตัวอักษรย่อสีสวยงามให้อัตโนมัติ)" }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wsInstructions = XLSX.utils.json_to_sheet(instructionData);

    // Auto-fit column widths
    ws['!cols'] = [
      { wch: 18 }, // ID
      { wch: 26 }, // Name
      { wch: 32 }, // Position
      { wch: 22 }, // Department
      { wch: 22 }, // ReportsTo
      { wch: 18 }, // RoleLevel
      { wch: 28 }, // Email
      { wch: 18 }, // Phone
      { wch: 40 }  // AvatarURL
    ];
    wsInstructions['!cols'] = [{ wch: 80 }];

    XLSX.utils.book_append_sheet(wb, ws, "OrgStructure");
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

    XLSX.writeFile(wb, "OrgChart_Template.xlsx");
  }

  /**
   * Export current org chart data to Excel
   */
  static exportToExcel(data, fileName = "Organization_Structure.xlsx") {
    if (typeof XLSX === 'undefined') return;

    const formattedData = data.map(item => ({
      "ID": item.id || "",
      "Name": item.name || "",
      "Position": item.position || "",
      "Department": item.department || "General",
      "ReportsTo": item.reportsTo || "",
      "RoleLevel": item.roleLevel || "Staff",
      "Email": item.email || "",
      "Phone": item.phone || "",
      "AvatarURL": item.avatarUrl || ""
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedData);

    ws['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 16 },
      { wch: 35 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "OrgStructure");
    XLSX.writeFile(wb, fileName);
  }

  /**
   * Parse uploaded Excel/CSV file
   */
  static async parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            return reject(new Error('ไฟล์ว่างเปล่าหรือไม่พบแผ่นงาน'));
          }

          // Use the first sheet or find one named OrgStructure
          let targetSheetName = workbook.SheetNames[0];
          if (workbook.SheetNames.includes('OrgStructure')) {
            targetSheetName = 'OrgStructure';
          }

          const worksheet = workbook.Sheets[targetSheetName];
          const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (rawJson.length === 0) {
            return reject(new Error('ไม่พบข้อมูลในตาราง Excel'));
          }

          // Normalize keys using column synonyms
          const normalizedData = ExcelService.normalizeRows(rawJson);

          // Validate hierarchy integrity
          const validationResult = ExcelService.validateHierarchy(normalizedData);

          resolve({
            rawData: normalizedData,
            validation: validationResult
          });
        } catch (err) {
          reject(new Error('ไม่สามารถอ่านไฟล์ได้: ' + err.message));
        }
      };

      reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการโหลดไฟล์'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Normalize rows by mapping various column names to standard property names
   */
  static normalizeRows(rows) {
    return rows.map((row, idx) => {
      const normalized = {
        id: '',
        name: '',
        position: '',
        department: 'General',
        reportsTo: '',
        roleLevel: 'Staff',
        email: '',
        phone: '',
        avatarUrl: ''
      };

      const keys = Object.keys(row);

      for (const [standardKey, synonyms] of Object.entries(ExcelService.COLUMN_MAP)) {
        for (const rawKey of keys) {
          const cleanRaw = rawKey.trim().toLowerCase().replace(/[\s\(\)\_\-\:]/g, '');
          const match = synonyms.some(syn => {
            const cleanSyn = syn.trim().toLowerCase().replace(/[\s\(\)\_\-\:]/g, '');
            return cleanRaw.includes(cleanSyn) || cleanRaw === cleanSyn;
          });

          if (match && row[rawKey] !== undefined) {
            normalized[standardKey] = String(row[rawKey]).trim();
            break;
          }
        }
      }

      // Fallback for missing ID: auto generate
      if (!normalized.id) {
        normalized.id = `EMP${String(idx + 1).padStart(3, '0')}`;
      }

      // Default name if missing
      if (!normalized.name) {
        normalized.name = `พนักงาน ${normalized.id}`;
      }

      // Default position if missing
      if (!normalized.position) {
        normalized.position = 'Member';
      }

      return normalized;
    });
  }

  /**
   * Validate hierarchy integrity:
   * - Duplicate IDs
   * - Missing Parents
   * - Circular references
   */
  static validateHierarchy(items) {
    const errors = [];
    const warnings = [];
    const idMap = new Map();
    const roots = [];

    // Check duplicate IDs
    items.forEach((item, index) => {
      const id = String(item.id).trim();
      if (!id) {
        errors.push(`แถวที่ ${index + 1}: ไม่พบรหัส ID ของพนักงาน`);
        return;
      }

      if (idMap.has(id)) {
        errors.push(`รหัส ID ซ้ำ: พบรหัส "${id}" ซ้ำกันในตาราง (${item.name})`);
      } else {
        idMap.set(id, item);
      }

      if (!item.reportsTo || item.reportsTo === id) {
        item.reportsTo = ''; // normalize root
        roots.push(item);
      }
    });

    // Check missing parent IDs
    items.forEach(item => {
      if (item.reportsTo && !idMap.has(item.reportsTo)) {
        warnings.push(`พนักงาน "${item.name}" (ID: ${item.id}) อ้างอิงหัวหน้า ID "${item.reportsTo}" ที่ไม่มีอยู่ในระบบ (ระบบจะตั้งให้เป็นโหนดอิสระชั่วคราว)`);
      }
    });

    // Check circular dependencies
    items.forEach(item => {
      const visited = new Set();
      let current = item;
      while (current && current.reportsTo) {
        if (visited.has(current.id)) {
          errors.push(`พบข้อผิดพลาดสายการบังคับบัญชาวนลูป (Circular Reference) เกี่ยวข้องกับ "${item.name}" (ID: ${item.id})`);
          break;
        }
        visited.add(current.id);
        current = idMap.get(current.reportsTo);
      }
    });

    if (roots.length === 0 && items.length > 0 && errors.length === 0) {
      warnings.push(`ไม่พบตำแหน่งสูงสุดขององค์กร (ตำแหน่งที่เว้นว่างช่อง ReportsTo) ระบบจะตั้งให้คนแรก (${items[0].name}) เป็นตำแหน่งสูงสุดอัตโนมัติ`);
      items[0].reportsTo = '';
      roots.push(items[0]);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalCount: items.length,
      rootCount: roots.length
    };
  }
}

window.ExcelService = ExcelService;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ExcelService };
}
