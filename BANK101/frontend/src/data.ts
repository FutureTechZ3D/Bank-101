// Static exam hierarchy used by the dashboard.
// Removed on purpose (security): the demo user list with usernames+passwords that was copied from Logins.txt,
// and JSON_QUIZZES, which shipped quiz answer keys (correct_option) inside the browser bundle.
// Quizzes and answers come only from the API; use the admin importer for question banks.

// ─── HIERARCHY DATA (From HTML) ─────────────────────────────────────────────
export const HIERARCHY_DATA = {
  exams: [
    {
      id: 'tnpsc', label: 'TNPSC', icon: '🏛️', sub: 'Tamil Nadu PSC',
      color: 'from-blue-600 to-indigo-700', logoUrl: 'https://ui-avatars.com/api/?name=TNPSC&background=1E3A8A&color=fff&size=256&font-size=0.33',
      types: [
        {
          id: 'g1', label: 'Group 1', sub: 'Class I Services',
          subjects: [
            { name: 'General Studies', icon: '📚', topics: ['History', 'Polity', 'Geography', 'Economy', 'Science', 'Current Affairs'] },
            { name: 'Tamil', icon: '📖', topics: ['Grammar', 'Literature', 'Comprehension', 'Vocabulary', 'Essay'] },
            { name: 'Aptitude & Mental Ability', icon: '🔢', topics: ['Numbers', 'Ratio', 'Time & Work', 'Data Interpretation', 'Logical Reasoning'] }
          ]
        },
        {
          id: 'g2', label: 'Group 2', sub: 'Class II Services',
          subjects: [
            { name: 'General Studies', icon: '📚', topics: ['History', 'Polity', 'Geography', 'Economy', 'Science', 'Current Affairs'] },
            { name: 'Tamil', icon: '📖', topics: ['Grammar', 'Literature', 'Comprehension'] },
            { name: 'Aptitude', icon: '🔢', topics: ['Numbers', 'Ratio', 'Time & Work', 'Reasoning'] }
          ]
        },
        {
          id: 'g4', label: 'Group 4 / VAO', sub: 'Field posts',
          subjects: [
            { name: 'General Studies', icon: '📚', topics: ['History', 'Geography', 'Science', 'Polity'] },
            { name: 'Tamil', icon: '📖', topics: ['Grammar', 'Vocabulary', 'Comprehension'] },
            { name: 'Arithmetic', icon: '🔢', topics: ['Basic Maths', 'Percentages', 'Simple Interest'] }
          ]
        },
        {
          id: 'ccse', label: 'CCSE IV', sub: 'Junior Assistant',
          subjects: [
            { name: 'General Studies', icon: '📚', topics: ['History', 'Polity', 'Science', 'Current Affairs'] },
            { name: 'Tamil / English', icon: '📖', topics: ['Grammar', 'Comprehension', 'Vocabulary'] },
            { name: 'Aptitude', icon: '🔢', topics: ['Numbers', 'Reasoning', 'Data'] }
          ]
        }
      ]
    },
    {
      id: 'bank', label: 'Bank Exams', icon: '🏦', sub: 'IBPS, SBI, RBI…',
      color: 'from-amber-500 to-yellow-600', logoUrl: 'https://ui-avatars.com/api/?name=BANK&background=d97706&color=fff&size=256&font-size=0.33',
      types: [
        {
          id: 'ibps_po', label: 'IBPS PO', sub: 'Prelim + Main',
          subjects: [
            { name: 'Quantitative Aptitude', icon: '➗', topics: ['Simplification', 'Number Series', 'Data Interpretation', 'Quadratic Equations', 'Time & Work', 'Time & Distance', 'Profit & Loss', 'Simple & Compound Interest', 'Permutation', 'Data Sufficiency'] },
            { name: 'Reasoning', icon: '🧠', topics: ['Seating Arrangement', 'Puzzles', 'Syllogism', 'Coding-Decoding', 'Blood Relations', 'Direction Sense', 'Inequality', 'Input-Output', 'Logical Reasoning', 'Critical Reasoning'] },
            { name: 'English', icon: '🔤', topics: ['Reading Comprehension', 'Cloze Test', 'Error Detection', 'Fill in Blanks', 'Sentence Rearrangement', 'Vocabulary', 'Tenses', 'Para Jumbles'] },
            { name: 'General Awareness', icon: '🌍', topics: ['Banking Awareness', 'Current Affairs', 'Static GK', 'Financial Awareness', 'Government Schemes'] },
            { name: 'Computer Knowledge', icon: '💻', topics: ['Basics', 'MS Office', 'Internet', 'Networking', 'Security', 'DBMS'] }
          ]
        },
        {
          id: 'sbi_po', label: 'SBI PO', sub: 'Prelim + Main + Interview',
          subjects: [
            { name: 'Quantitative Aptitude', icon: '➗', topics: ['Simplification', 'Number Series', 'Data Interpretation', 'Percentage', 'Averages', 'Ratio', 'Mixture', 'Time & Work', 'Speed', 'Probability'] },
            { name: 'Reasoning', icon: '🧠', topics: ['Seating Arrangement', 'Puzzles', 'Syllogism', 'Coding', 'Blood Relations', 'Direction', 'Inequality', 'Machine Input', 'Analytical Reasoning'] },
            { name: 'English', icon: '🔤', topics: ['Reading Comprehension', 'Grammar', 'Vocabulary', 'Sentence Correction', 'Fill in Blanks', 'Error Spotting'] },
            { name: 'General Awareness', icon: '🌍', topics: ['Banking & Finance', 'Current Affairs', 'Economy', 'Budget', 'Static GK'] },
            { name: 'Data Analysis', icon: '📊', topics: ['Bar Graph', 'Pie Chart', 'Line Graph', 'Tabulation', 'Caselet DI', 'Missing DI'] }
          ]
        },
        {
          id: 'ibps_clerk', label: 'IBPS Clerk', sub: 'Prelim + Main',
          subjects: [
            { name: 'Quantitative Aptitude', icon: '➗', topics: ['Simplification', 'Approximation', 'Number Series', 'Basic Arithmetic', 'Data Interpretation'] },
            { name: 'Reasoning', icon: '🧠', topics: ['Puzzles', 'Seating Arrangement', 'Syllogism', 'Inequality', 'Coding', 'Direction'] },
            { name: 'English', icon: '🔤', topics: ['Comprehension', 'Cloze Test', 'Spotting Errors', 'Fill in Blanks', 'Vocabulary'] },
            { name: 'General/Financial Awareness', icon: '🌍', topics: ['Banking Current Affairs', 'Static GK', 'Economy', 'Government Schemes'] },
            { name: 'Computer Aptitude', icon: '💻', topics: ['Basics', 'Input-Output', 'Memory', 'Operating Systems', 'Office Tools'] }
          ]
        },
        {
          id: 'rbi', label: 'RBI Grade B', sub: 'Phase I + Phase II',
          subjects: [
            { name: 'Quantitative Aptitude', icon: '➗', topics: ['Data Interpretation', 'Advanced Maths', 'Statistics', 'Probability'] },
            { name: 'Reasoning', icon: '🧠', topics: ['High-level Puzzles', 'Critical Reasoning', 'Analytical Ability'] },
            { name: 'English', icon: '🔤', topics: ['Advanced Comprehension', 'Essay', 'Precis Writing', 'Letter Writing'] },
            { name: 'Finance & Management', icon: '💼', topics: ['Economic & Social Issues', 'Finance', 'Management', 'RBI Functions'] },
            { name: 'General Awareness', icon: '🌍', topics: ['Economy', 'Banking Regulation', 'Current Affairs', 'International Finance'] }
          ]
        }
      ]
    },
    {
      id: 'ssc', label: 'SSC', icon: '📋', sub: 'CGL, CHSL, MTS…',
      color: 'from-emerald-600 to-teal-700', logoUrl: 'https://ui-avatars.com/api/?name=SSC&background=059669&color=fff&size=256&font-size=0.33',
      types: [
        {
          id: 'cgl', label: 'CGL', sub: 'Combined Graduate Level',
          subjects: [
            { name: 'Quantitative Aptitude', icon: '➗', topics: ['Algebra', 'Geometry', 'Trigonometry', 'Mensuration', 'Number System', 'Percentages', 'Averages', 'Ratio', 'Time & Work', 'DI'] },
            { name: 'English', icon: '🔤', topics: ['Vocabulary', 'Comprehension', 'Spelling', 'Idioms', 'Sentence Improvement', 'Fill in Blanks', 'Error Detection'] },
            { name: 'General Intelligence', icon: '🧠', topics: ['Analogy', 'Classification', 'Series', 'Coding-Decoding', 'Blood Relations', 'Direction', 'Matrix', 'Venn Diagrams'] },
            { name: 'General Awareness', icon: '🌍', topics: ['History', 'Geography', 'Polity', 'Economy', 'Science', 'Current Affairs'] }
          ]
        },
        {
          id: 'chsl', label: 'CHSL', sub: 'LDC/DEO/PA/SA',
          subjects: [
            { name: 'Quantitative Aptitude', icon: '➗', topics: ['Arithmetic', 'Number System', 'Algebra', 'Geometry', 'DI'] },
            { name: 'English', icon: '🔤', topics: ['Grammar', 'Vocabulary', 'Comprehension', 'Error Detection'] },
            { name: 'General Intelligence', icon: '🧠', topics: ['Analogy', 'Series', 'Classification', 'Coding', 'Reasoning'] },
            { name: 'General Awareness', icon: '🌍', topics: ['History', 'Science', 'Polity', 'Current Affairs'] }
          ]
        },
        {
          id: 'mts', label: 'MTS', sub: 'Multi Tasking Staff',
          subjects: [
            { name: 'Numerical Aptitude', icon: '➗', topics: ['Basic Arithmetic', 'Number System', 'Simple Interest', 'Percentages'] },
            { name: 'English/Hindi', icon: '🔤', topics: ['Grammar', 'Comprehension', 'Vocabulary'] },
            { name: 'General Intelligence', icon: '🧠', topics: ['Analogy', 'Classification', 'Series'] },
            { name: 'General Awareness', icon: '🌍', topics: ['Current Affairs', 'History', 'Science', 'Geography'] }
          ]
        }
      ]
    },
    {
      id: 'rrb', label: 'RRB', icon: '🚂', sub: 'NTPC, Group D, ALP…',
      color: 'from-cyan-600 to-blue-700', logoUrl: 'https://ui-avatars.com/api/?name=RRB&background=0284c7&color=fff&size=256&font-size=0.33',
      types: [
        {
          id: 'ntpc', label: 'RRB NTPC', sub: 'CBT 1 + CBT 2',
          subjects: [
            { name: 'Mathematics', icon: '➗', topics: ['Number System', 'Fractions', 'LCM/HCF', 'Ratio', 'Percentage', 'Mensuration', 'Time & Work', 'Time & Distance', 'Simple & Compound Interest', 'Profit & Loss', 'Algebra', 'Geometry', 'Trigonometry', 'Statistics & Probability'] },
            { name: 'General Intelligence', icon: '🧠', topics: ['Analogy', 'Number Series', 'Coding-Decoding', 'Mathematical Operations', 'Relationships', 'Syllogism', 'Jumbling', 'Venn Diagrams', 'Puzzle'] },
            { name: 'General Awareness', icon: '🌍', topics: ['Current Affairs', 'Indian Railways', 'Indian Polity', 'Economy', 'History', 'Science & Technology', 'Environment'] }
          ]
        },
        {
          id: 'groupd', label: 'Group D', sub: 'CBT + PET',
          subjects: [
            { name: 'Mathematics', icon: '➗', topics: ['Basic Arithmetic', 'Number System', 'Percentage', 'Ratio', 'Mensuration', 'Time & Work'] },
            { name: 'General Intelligence', icon: '🧠', topics: ['Analogy', 'Series', 'Coding', 'Reasoning', 'Venn Diagrams'] },
            { name: 'General Science', icon: '🔬', topics: ['Physics', 'Chemistry', 'Life Sciences', 'Environment'] },
            { name: 'General Awareness', icon: '🌍', topics: ['Current Affairs', 'History', 'Geography', 'Polity'] }
          ]
        },
        {
          id: 'alp', label: 'ALP', sub: 'Stage 1 + Stage 2',
          subjects: [
            { name: 'Mathematics', icon: '➗', topics: ['Number System', 'Algebra', 'Geometry', 'Trigonometry', 'DI', 'Mensuration'] },
            { name: 'General Intelligence', icon: '🧠', topics: ['Analogy', 'Classification', 'Series', 'Coding', 'Syllogism'] },
            { name: 'Basic Science', icon: '🔬', topics: ['Physics (Units, Motion, Electricity)', 'Chemistry (Periodic Table, Reactions)', 'Environment'] },
            { name: 'Technical Trade', icon: '⚙️', topics: ['Technical Trade Core Topics'] }
          ]
        }
      ]
    },
    {
      id: 'upsc', label: 'UPSC', icon: '🇮🇳', sub: 'IAS, CDS, NDA…',
      color: 'from-purple-600 to-pink-700', logoUrl: 'https://ui-avatars.com/api/?name=UPSC&background=4f46e5&color=fff&size=256&font-size=0.33',
      types: [
        {
          id: 'ias', label: 'Civil Services', sub: 'Prelim + Mains',
          subjects: [
            { name: 'General Studies I', icon: '📚', topics: ['History of India', 'Indian Culture', 'World History', 'Indian Society', 'Geography'] },
            { name: 'General Studies II', icon: '⚖️', topics: ['Polity', 'Governance', 'Constitution', 'Social Justice', 'International Relations'] },
            { name: 'General Studies III', icon: '💡', topics: ['Economy', 'Technology', 'Environment', 'Security', 'Disaster Management', 'Agriculture'] },
            { name: 'General Studies IV', icon: '🌱', topics: ['Ethics', 'Integrity', 'Aptitude', 'Emotional Intelligence', 'Case Studies'] },
            { name: 'CSAT / Aptitude', icon: '🔢', topics: ['Comprehension', 'Arithmetic', 'Reasoning', 'Data Interpretation', 'Decision Making'] }
          ]
        },
        {
          id: 'nda', label: 'NDA / NA', sub: 'Written + SSB',
          subjects: [
            { name: 'Mathematics', icon: '➗', topics: ['Algebra', 'Matrices', 'Trigonometry', 'Calculus', 'Statistics', 'Vectors'] },
            { name: 'General Ability', icon: '📚', topics: ['English', 'Physics', 'Chemistry', 'General Science', 'History', 'Geography', 'Current Events'] }
          ]
        },
        {
          id: 'cds', label: 'CDS', sub: 'Written + SSB',
          subjects: [
            { name: 'English', icon: '🔤', topics: ['Grammar', 'Comprehension', 'Vocabulary', 'Fill in Blanks', 'Spotting Errors'] },
            { name: 'General Knowledge', icon: '🌍', topics: ['Current Affairs', 'Polity', 'Economy', 'History', 'Science', 'Defence'] },
            { name: 'Mathematics', icon: '➗', topics: ['Arithmetic', 'Algebra', 'Trigonometry', 'Geometry', 'Statistics'] }
          ]
        }
      ]
    },
    {
      id: 'gate', label: 'GATE', icon: '🎓', sub: 'CS, ECE, Mech…',
      color: 'from-cyan-600 to-teal-600', logoUrl: 'https://ui-avatars.com/api/?name=GATE&background=0891b2&color=fff&size=256&font-size=0.33',
      types: [
        {
          id: 'cs', label: 'CS / IT', sub: 'Computer Science',
          subjects: [
            { name: 'Engineering Mathematics', icon: '📐', topics: ['Discrete Maths', 'Linear Algebra', 'Calculus', 'Probability', 'Statistics'] },
            { name: 'DBMS', icon: '🗄️', topics: ['ER Diagrams', 'SQL', 'Normalization', 'Transactions', 'Indexing'] },
            { name: 'OS', icon: '💻', topics: ['Processes', 'Memory Management', 'File Systems', 'Scheduling', 'Deadlocks'] },
            { name: 'Computer Networks', icon: '🌐', topics: ['OSI Model', 'TCP/IP', 'Routing', 'DNS', 'HTTP', 'Security'] },
            { name: 'Algorithms & Data Structures', icon: '🔁', topics: ['Sorting', 'Searching', 'Graph Algorithms', 'Dynamic Programming', 'Complexity'] },
            { name: 'Digital Logic & COA', icon: '⚡', topics: ['Boolean Algebra', 'Combinational Circuits', 'Pipelining', 'Cache', 'ISA'] },
            { name: 'TOC & Compilers', icon: '🔧', topics: ['Automata', 'Grammars', 'Languages', 'Parsing', 'Code Generation'] }
          ]
        },
        {
          id: 'ece', label: 'ECE', sub: 'Electronics & Communication',
          subjects: [
            { name: 'Engineering Mathematics', icon: '📐', topics: ['Linear Algebra', 'Calculus', 'Differential Equations', 'Complex Variables', 'Probability'] },
            { name: 'Signals & Systems', icon: '📡', topics: ['LTI Systems', 'Fourier Transform', 'Z Transform', 'Sampling', 'Convolution'] },
            { name: 'Networks', icon: '⚡', topics: ['KVL/KCL', 'Network Theorems', 'Resonance', 'Two-port Networks'] },
            { name: 'Analog & Digital Circuits', icon: '🔌', topics: ['Diodes', 'BJT', 'FET', 'Op-Amps', 'ADC/DAC', 'Logic Gates'] },
            { name: 'Communications', icon: '📻', topics: ['AM/FM', 'Digital Modulation', 'CDMA', 'OFDM', 'Error Coding'] }
          ]
        }
      ]
    },
    {
      id: 'neet', label: 'NEET', icon: '🏥', sub: 'NEET UG & PG',
      color: 'from-green-600 to-emerald-700', logoUrl: 'https://ui-avatars.com/api/?name=NEET&background=10b981&color=fff&size=256&font-size=0.33',
      types: [
        {
          id: 'ug', label: 'NEET UG', sub: 'MBBS/BDS Admission',
          subjects: [
            { name: 'Physics', icon: '⚡', topics: ['Mechanics', 'Thermodynamics', 'Electrostatics', 'Magnetism', 'Optics', 'Modern Physics'] },
            { name: 'Chemistry', icon: '🧪', topics: ['Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry', 'Biomolecules', 'Polymers'] },
            { name: 'Biology (Botany)', icon: '🌿', topics: ['Cell Biology', 'Genetics', 'Ecology', 'Plant Physiology', 'Reproduction'] },
            { name: 'Biology (Zoology)', icon: '🐾', topics: ['Human Physiology', 'Animal Kingdom', 'Reproduction', 'Evolution', 'Health & Disease'] }
          ]
        }
      ]
    },
    {
      id: 'tet', label: 'TET', icon: '👩‍🏫', sub: 'Paper I & II, Tamil TET',
      color: 'from-teal-600 to-emerald-600', logoUrl: 'https://ui-avatars.com/api/?name=TET&background=0d9488&color=fff&size=256&font-size=0.33',
      types: [
        {
          id: 'p1', label: 'TET Paper I', sub: 'Class 1-5 teachers',
          subjects: [
            { name: 'Child Development & Pedagogy', icon: '🧒', topics: ['Child Psychology', 'Learning Theories', 'Inclusive Education', 'Assessment', 'Teaching Methods'] },
            { name: 'Tamil Language I', icon: '📖', topics: ['Grammar', 'Literature', 'Comprehension', 'Pedagogy'] },
            { name: 'English Language', icon: '🔤', topics: ['Grammar', 'Vocabulary', 'Reading & Comprehension', 'Writing Skills', 'Language Acquisition', 'English Pedagogy'] },
            { name: 'Mathematics', icon: '➗', topics: ['Number System', 'Geometry', 'Measurement', 'Data Handling', 'Pedagogy'] },
            { name: 'Environmental Studies', icon: '🌿', topics: ['Family & Friends', 'Food', 'Shelter', 'Water', 'Travel', 'Things Around Us'] }
          ]
        },
        {
          id: 'p2', label: 'TET Paper II', sub: 'Class 6-8 teachers',
          subjects: [
            { name: 'Child Development & Pedagogy', icon: '🧒', topics: ['Child Psychology', 'Adolescent Development', 'Learning', 'Assessment', 'Inclusive Education'] },
            { name: 'Tamil Language II', icon: '📖', topics: ['Advanced Grammar', 'Literature', 'Comprehension', 'Pedagogy'] },
            { name: 'English Language II', icon: '🔤', topics: ['Grammar', 'Writing Skills', 'Poetry & Drama', 'Critical Reading', 'English Language teaching strategies'] },
            { name: 'Maths & Science (or) Social Science', icon: '📐', topics: ['Advanced Maths', 'Physics', 'Chemistry', 'Biology (or) History', 'Polity', 'Geography', 'Economics'] }
          ]
        }
      ]
    },
    {
      id: 'trb', label: 'TRB', icon: '👨‍🏫', sub: 'PG Asst, BT Asst…',
      color: 'from-rose-500 to-orange-600', logoUrl: 'https://ui-avatars.com/api/?name=TRB&background=f43f5e&color=fff&size=256&font-size=0.33',
      types: [
        {
          id: 'pg', label: 'PG Assistant', sub: 'Higher Secondary',
          subjects: [
            { name: 'Subject Knowledge', icon: '📚', topics: ['Based on the subject chosen (Tamil/English/Maths/Physics/Chemistry/Biology/History/Geography/CS etc.)'] },
            { name: 'Educational Psychology', icon: '🧒', topics: ['Child Development', 'Learning', 'Assessment', 'Classroom Management'] },
            { name: 'General Knowledge', icon: '🌍', topics: ['Current Affairs', 'Tamil Culture', 'Polity', 'Economy'] }
          ]
        },
        {
          id: 'bt', label: 'BT Assistant', sub: 'Secondary level',
          subjects: [
            { name: 'Subject Knowledge', icon: '📚', topics: ['Core subject topics based on specialisation'] },
            { name: 'Education Theory', icon: '🧒', topics: ['Pedagogy', 'Child Psychology', 'Curriculum', 'Assessment'] },
            { name: 'GK / Current Affairs', icon: '🌍', topics: ['State & National Events', 'Culture', 'Polity'] }
          ]
        }
      ]
    },
    {
      id: 'jee', label: 'JEE', icon: '⚗️', sub: 'Main & Advanced',
      color: 'from-orange-500 to-amber-600', logoUrl: 'https://ui-avatars.com/api/?name=JEE&background=f97316&color=fff&size=256&font-size=0.33',
      types: [
        {
          id: 'main', label: 'JEE Main', sub: 'Paper 1 (B.Tech)',
          subjects: [
            { name: 'Physics', icon: '⚡', topics: ['Mechanics', 'Thermodynamics', 'Waves', 'Optics', 'Electrostatics', 'Magnetism', 'Modern Physics'] },
            { name: 'Chemistry', icon: '🧪', topics: ['Physical (Equilibrium, Kinetics, Electrochemistry)', 'Organic (Reactions, Mechanisms)', 'Inorganic (Periodic Table, Compounds, Coordination)'] },
            { name: 'Mathematics', icon: '📐', topics: ['Algebra', 'Trigonometry', 'Coordinate Geometry', 'Calculus', 'Vectors & 3D', 'Statistics & Probability'] }
          ]
        },
        {
          id: 'adv', label: 'JEE Advanced', sub: 'IIT Admission',
          subjects: [
            { name: 'Physics', icon: '⚡', topics: ['Mechanics (Advanced)', 'Rigid Body', 'Fluids', 'Optics', 'Modern Physics', 'Nuclear Physics'] },
            { name: 'Chemistry', icon: '🧪', topics: ['Advanced Organic', 'Spectroscopy Basics', 'Complex Reactions', 'Inorganic Bonding', 'Thermodynamics'] },
            { name: 'Mathematics', icon: '📐', topics: ['Functions', 'Limits', 'Differential Equations', 'Matrices', 'Complex Numbers', 'Integration (Advanced)', 'Conic Sections'] }
          ]
        }
      ]
    }
  ]
};
