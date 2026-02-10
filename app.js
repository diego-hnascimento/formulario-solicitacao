const SUPABASE_URL = 'https://hppmslrkwagfhqdtwbbk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwcG1zbHJrd2FnZmhxZHR3YmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjU1NzYsImV4cCI6MjA4NjMwMTU3Nn0.R4hTQb4vJeFDlm3dscvZQVFd7xyR9c0ssrJwhc_pa1M';

async function salvarNoSupabase(dados) {
    const url = `${SUPABASE_URL}/rest/v1/solicitacoes`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(dados)
    });

    if (!response.ok) {
        // Tenta ler a mensagem de erro detalhada vinda do Supabase
        const erroJson = await response.json();
        console.error("Erro detalhado do Supabase:", erroJson);
        throw new Error(erroJson.message || 'Erro ao salvar no banco');
    }

    return await response.json();
}
/**
 * Faz o upload de um ficheiro para o Supabase Storage
 * @param {File} file Objeto do ficheiro vindo do input
 * @param {string} folder Pasta dentro do bucket (ex: cpf do paciente)
 */
async function uploadFicheiro(file, folder) {
    if (!file) return null;

    // 1. Limpa o nome do arquivo: remove acentos, espaços e caracteres especiais
    const cleanFileName = file.name
        .normalize('NFD')                     // Decompõe caracteres com acentos (ex: é -> e + ´)
        .replace(/[\u0300-\u036f]/g, "")      // Remove os acentos
        .replace(/\s+/g, '_')                 // Substitui espaços por underline
        .replace(/[^\w.-]/g, '');             // Remove qualquer coisa que não seja letra, número, ponto ou traço

    // 2. Cria o caminho final
    const path = `${folder}/${Date.now()}-${cleanFileName}`;
    const url = `${SUPABASE_URL}/storage/v1/object/documentos_solicitacoes/${path}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': file.type
        },
        body: file
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Erro no upload:", errorData);
        return null;
    }

    // Retorna a URL pública
    return `${SUPABASE_URL}/storage/v1/object/public/documentos_solicitacoes/${path}`;
}

let currentStep = 1;
const formData = {
    professional: {
        fullName: '',
        cpf: '',
        email: '',
        phone: '',
        healthRegion: '',
        municipality: '',
        estabelecimento: ''
    },
    patient: {
        fullName: '',
        cpf: '',
        birthDate: '',
        region: '',
        municipality: '',
        medicalCondition: '',
        peso: ''
    },
    documentation: {
        photoDocument: null,
        proofOfResidence: null,
        medicalReport: null,
        cadernetaVacinacao: null
    }
};

// 1. O MAPA DAS CIDADES (O "CÉREBRO" DO FILTRO)
const cidadesPorRegiao = {
    "1": ["Abreu e Lima", "Araçoiaba", "Cabo de Santo Agostinho", "Camaragibe", "Chã de Alegria", "Chã Grande", "Fernando de Noronha", "Glória do Goitá", "Igarassu", "Ipojuca", "Ilha de Itamaracá", "Itapissuma", "Jaboatão dos Guararapes", "Moreno", "Olinda", "Paulista", "Pombos", "Recife", "São Lourenço da Mata", "Vitória de Santo Antão"],
    "2": ["Bom Jardim", "Buenos Aires", "Carpina", "Casinhas", "Cumaru", "Feira Nova", "João Alfredo", "Lagoa do Carro", "Lagoa do Itaenga", "Limoeiro", "Machados", "Nazaré da Mata", "Orobó", "Passira", "Paudalho", "Salgadinho", "Surubim", "Tracunhaém", "Vertente do Lério", "Vicência"],
    "3": ["Água Preta", "Amaraji", "Barreiros", "Belém de Maria", "Catende", "Cortês", "Escada", "Gameleira", "Jaqueira", "Joaquim Nabuco", "Maraial", "Palmares", "Palmeirina", "Primavera", "Quipapá", "Ribeirão", "Rio Formoso", "São Benedito do Sul", "São José da Coroa Grande", "Sirinhaém", "Tamandaré", "Xexéu"],
    "4": ["Agrestina", "Alagoinha", "Altinho", "Barra de Guabiraba", "Belo Jardim", "Bezerros", "Bonito", "Brejo da Madre de Deus", "Cachoeirinha", "Camocim de São Félix", "Caruaru", "Cupira", "Frei Miguelinho", "Gravatá", "Ibirajuba", "Jataúba", "Jurema", "Lagoa dos Gatos", "Lajedo", "Panelas", "Pesqueira", "Poção", "Riacho das Almas", "Sairé", "Sanharó", "Santa Cruz do Capibaribe", "Santa Maria do Cambucá", "São Caitano", "São Joaquim do Monte", "Tacaimbó", "Taquaritinga do Norte", "Toritama", "Vertentes"],
    "5": ["Águas Belas", "Angelim", "Bom Conselho", "Brejão", "Caetés", "Calçado", "Canhotinho", "Capoeiras", "Correntes", "Garanhuns", "Iati", "Itaíba", "Jucati", "Jupi", "Lagoa do Ouro", "Lajedo", "Palmeirina", "Paranatama", "Saloá", "São João", "Terezinha"],
    "6": ["Arcoverde", "Buíque", "Custódia", "Ibimirim", "Inajá", "Manari", "Pedra", "Sertânia", "Tupanatinga", "Venturosa"],
    "7": ["Belém do São Francisco", "Cedro", "Mirandiba", "Salgueiro", "Serrita", "Terra Nova", "Verdejante"],
    "8": ["Afrânio", "Cabrobó", "Dormentes", "Lagoa Grande", "Orocó", "Petrolina", "Santa Maria da Boa Vista"],
    "9": ["Araripina", "Bodocó", "Exu", "Granito", "Ipubi", "Moreilândia", "Ouricuri", "Parnamirim", "Santa Cruz", "Santa Filomena", "Trindade"],
    "10": ["Afogados da Ingazeira", "Brejinho", "Carnaíba", "Iguaracy", "Ingazeira", "Itapetim", "Quixaba", "Santa Terezinha", "São José do Egito", "Solidão", "Tabira", "Tuparetama"],
    "11": ["Betânia", "Calumbi", "Carnaubeira da Penha", "Flores", "Floresta", "Itacuruba", "Santa Cruz da Baixa Verde", "São José do Belmonte", "Serra Talhada", "Triunfo"],
    "12": ["Aliança", "Camutanga", "Condado", "Ferreiros", "Goiana", "Itambé", "Itaquitinga", "Macaparana", "São Vicente Férrer", "Timbaúba"]
};

// 2. A FUNÇÃO QUE FAZ A MÁGICA
function atualizarMunicipios(regiaoId, municipioSelectId) {
    const selectMunicipio = document.getElementById(municipioSelectId);

    // Limpa o select
    selectMunicipio.innerHTML = '<option value="">Selecione o município</option>';

    if (regiaoId && cidadesPorRegiao[regiaoId]) {
        selectMunicipio.disabled = false;
        cidadesPorRegiao[regiaoId].forEach(cidade => {
            const option = new Option(cidade, cidade);
            selectMunicipio.add(option);
        });
    } else {
        selectMunicipio.disabled = true;
        selectMunicipio.innerHTML = '<option value="">Selecione primeiro a região</option>';
    }
}

function goToStep(step) {
    if (step === currentStep + 1 && !validateCurrentStep()) {
        return;
    }

    saveCurrentStepData();
    currentStep = step;
    updateUI();
}

function updateUI() {
    document.querySelectorAll('.form-section').forEach((section, index) => {
        section.classList.toggle('active', index + 1 === currentStep);
    });

    for (let i = 1; i <= 3; i++) {
        const circle = document.getElementById(`step-${i}-circle`);
        const label = document.getElementById(`step-${i}-label`);

        circle.classList.remove('active', 'completed');
        label.classList.remove('active');

        if (i < currentStep && currentStep !== 4) {
            circle.classList.add('completed');
        } else if (i === currentStep) {
            circle.classList.add('active');
            label.classList.add('active');
        }
    }

    if (currentStep < 4) {
        restoreStepData();
    }
}

function validateCurrentStep() {
    const errors = [];

    if (currentStep === 1) {
        const prof = {
            fullName: document.getElementById('prof-fullname').value,
            cpf: document.getElementById('prof-cpf').value,
            email: document.getElementById('prof-email').value,
            phone: document.getElementById('prof-phone').value,
            region: document.getElementById('prof-region').value,
            municipality: document.getElementById('prof-municipality').value,
            estabelecimento: document.getElementById('prof-estabelecimento').value
        };

        if (!prof.fullName) errors.push('prof-fullname');
        if (!prof.cpf || !isValidCPF(prof.cpf)) errors.push('prof-cpf');
        if (!prof.email || !isValidEmail(prof.email)) errors.push('prof-email');
        if (!prof.phone) errors.push('prof-phone');
        if (!prof.region) errors.push('prof-region');
        if (!prof.municipality) errors.push('prof-municipality');
        if (!prof.estabelecimento) errors.push('prof-estabelecimento');
    } else if (currentStep === 2) {
        const patient = {
            fullName: document.getElementById('patient-fullname').value,
            cpf: document.getElementById('patient-cpf').value,
            birthDate: document.getElementById('patient-birthdate').value,
            region: document.getElementById('patient-region').value,
            municipality: document.getElementById('patient-municipality').value,
            condition: document.getElementById('patient-condition').value,
            peso: document.getElementById('patient-peso').value
        };

        if (!patient.fullName) errors.push('patient-fullname');
        if (!patient.cpf || !isValidCPF(patient.cpf)) errors.push('patient-cpf');
        if (!patient.birthDate) errors.push('patient-birthdate');
        if (!patient.region) errors.push('patient-region');
        if (!patient.municipality) errors.push('patient-municipality');
        if (!patient.condition) errors.push('patient-condition');
        if (!patient.peso) errors.push('patient-peso');
    } else if (currentStep === 3) {
        if (!document.getElementById('file-photo').files.length) errors.push('file-photo');
        if (!document.getElementById('file-residence').files.length) errors.push('file-residence');
        if (!document.getElementById('file-medical').files.length) errors.push('file-medical');
        if (!document.getElementById('file-caderneta').files.length) errors.push('file-caderneta');
    }

    displayErrors(errors);
    return errors.length === 0;
}

function displayErrors(errorIds) {
    document.querySelectorAll('.error-message').forEach(msg => {
        msg.classList.remove('show');
    });

    document.querySelectorAll('input, select, textarea').forEach(field => {
        field.classList.remove('error');
    });

    errorIds.forEach(id => {
        const errorMsg = document.getElementById(`error-${id}`);
        const field = document.getElementById(id);
        if (errorMsg) errorMsg.classList.add('show');
        if (field) field.classList.add('error');
    });
}

function saveCurrentStepData() {
    if (currentStep === 1) {
        formData.professional = {
            fullName: document.getElementById('prof-fullname').value,
            cpf: document.getElementById('prof-cpf').value,
            email: document.getElementById('prof-email').value,
            phone: document.getElementById('prof-phone').value,
            healthRegion: document.getElementById('prof-region').value,
            municipality: document.getElementById('prof-municipality').value,
            estabelecimento: document.getElementById('prof-estabelecimento').value
        };
    } else if (currentStep === 2) {
        formData.patient = {
            fullName: document.getElementById('patient-fullname').value,
            cpf: document.getElementById('patient-cpf').value,
            birthDate: document.getElementById('patient-birthdate').value,
            region: document.getElementById('patient-region').value,
            municipality: document.getElementById('patient-municipality').value,
            medicalCondition: document.getElementById('patient-condition').value,
            peso: document.getElementById('patient-peso').value
        };
    } else if (currentStep === 3) {
        formData.documentation = {
            photoDocument: document.getElementById('file-photo').files[0] || null,
            proofOfResidence: document.getElementById('file-residence').files[0] || null,
            medicalReport: document.getElementById('file-medical').files[0] || null,
            cadernetaVacinacao: document.getElementById('file-caderneta').files[0] || null
        };
    }
}

function restoreStepData() {
    if (currentStep === 1) {
        document.getElementById('prof-fullname').value = formData.professional.fullName;
        document.getElementById('prof-cpf').value = formData.professional.cpf;
        document.getElementById('prof-email').value = formData.professional.email;
        document.getElementById('prof-phone').value = formData.professional.phone;
        document.getElementById('prof-region').value = formData.professional.healthRegion;
        document.getElementById('prof-municipality').value = formData.professional.municipality;
        document.getElementById('prof-estabelecimento').value = formData.professional.estabelecimento;
    } else if (currentStep === 2) {
        document.getElementById('patient-fullname').value = formData.patient.fullName;
        document.getElementById('patient-cpf').value = formData.patient.cpf;
        document.getElementById('patient-birthdate').value = formData.patient.birthDate;
        document.getElementById('patient-region').value = formData.patient.region;
        document.getElementById('patient-municipality').value = formData.patient.municipality;
        document.getElementById('patient-condition').value = formData.patient.medicalCondition;
        document.getElementById('patient-peso').value = formData.patient.peso;
    }
}

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function isValidCPF(cpf) {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.length === 11;
}

function formatCPF(value) {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
}

function formatPhone(value) {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
}

async function finishForm() {
    try {
        const btn = document.querySelector('.btn-next');
        const loading = document.getElementById('loading-overlay');
        if (loading) loading.style.display = 'flex';

        // 1. Faz o upload dos arquivos e pega as URLs
        // Usamos o CPF do paciente para organizar as pastas
        const pasta = formData.patient.cpf.replace(/\D/g, '') || 'sem_cpf';

        const urlFoto = await uploadFicheiro(formData.documentation.photoDocument, `${pasta}/identidade`);
        const urlResidencia = await uploadFicheiro(formData.documentation.proofOfResidence, `${pasta}/residencia`);
        const urlLaudo = await uploadFicheiro(formData.documentation.medicalReport, `${pasta}/laudo`);
        const urlCaderneta = await uploadFicheiro(formData.documentation.cadernetaVacinacao, `${pasta}/caderneta`);

        // 2. MONTAGEM COMPLETA DO PAYLOAD (Aqui evita o NULL)
        const payload = {
            // Dados do Profissional
            prof_nome: formData.professional.fullName,
            prof_cpf: formData.professional.cpf,
            prof_email: formData.professional.email,
            prof_telefone: formData.professional.phone,
            prof_regional: formData.professional.healthRegion,
            prof_municipio: formData.professional.municipality,
            prof_estabelecimento: formData.professional.estabelecimento,

            // Dados do Paciente
            paciente_nome: formData.patient.fullName,
            paciente_cpf: formData.patient.cpf,
            paciente_nascimento: formData.patient.birthDate,
            paciente_regional: formData.patient.region,
            paciente_municipio: formData.patient.municipality,
            paciente_condicao: formData.patient.medicalCondition,
            paciente_peso: formData.patient.peso,

            // URLs dos Arquivos (As colunas que adicionamos no SQL)
            url_documento_foto: urlFoto,
            url_comprovante_residencia: urlResidencia,
            url_laudo_medico: urlLaudo,
            url_caderneta: urlCaderneta,

            status: 'Pendente'
        };

        console.log("Enviando tudo para o banco:", payload);

        // 3. Salva na tabela 'solicitacoes'
        await salvarNoSupabase(payload);

        // 4. Sucesso: Muda para a tela final
        document.getElementById('confirmation-prof-name').textContent = formData.professional.fullName;
        document.getElementById('confirmation-patient-name').textContent = formData.patient.fullName;
        document.getElementById('confirmation-date').textContent = new Date().toLocaleDateString('pt-BR');

        currentStep = 4;
        document.querySelectorAll('.form-section').forEach(s => s.style.display = 'none');
        document.getElementById('section-4').style.display = 'block';

    } catch (error) {
        console.error("Erro completo:", error);
        alert("❌ Erro ao finalizar solicitação.");
        const btn = document.querySelector('.btn-next');
        btn.innerText = "Confirmar Solicitação";
        btn.disabled = false;
    }
}

function startNewForm() {
    console.log("--- 🔄 Reiniciando Sistema e Navegação ---");

    // 1. Reset lógico do passo (Volta para o 1)
    currentStep = 1;

    // 2. Chama a sua função de limpeza original (que limpa formData e inputs)
    if (typeof resetForm === 'function') {
        resetForm();
    }

    // 3. RESET VISUAL DAS SEÇÕES (Garante que a Seção 1 apareça e as outras sumam)
    document.querySelectorAll('.form-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none'; // Esconde todas
    });

    const section1 = document.getElementById('section-1');
    if (section1) {
        section1.classList.add('active');
        section1.style.display = 'block'; // Mostra apenas a primeira
    }

    // 4. RESET DAS BOLINHAS (Indicadores de progresso)
    document.querySelectorAll('.step').forEach((step, idx) => {
        step.classList.remove('active', 'completed');
        if (idx === 0) step.classList.add('active');
    });

    // 5. RESET DO BOTÃO (Texto e Estado)
    const btnNext = document.querySelector('.btn-next');
    if (btnNext) {
        btnNext.innerText = "Próximo Passo";
    }

    // 6. REATIVAR VALIDAÇÃO (O "pulo do gato")
    // Forçamos o disparo do evento 'input' em todos os campos do Passo 1.
    // Isso faz com que a lógica original do seu app.js (que libera o botão) rode.
    const fieldsStep1 = ['prof-name', 'prof-cpf', 'prof-email', 'prof-phone'];
    fieldsStep1.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log("✅ Sistema pronto: Navegação restaurada.");
    console.log(btnNext)
}

function resetForm() {
    formData.professional = {
        fullName: '',
        cpf: '',
        email: '',
        phone: '',
        healthRegion: '',
        municipality: '',
        estabelecimento: ''
    };
    formData.patient = {
        fullName: '',
        cpf: '',
        birthDate: '',
        region: '',
        municipality: '',
        medicalCondition: '',
        peso: ''
    };
    formData.documentation = {
        photoDocument: null,
        proofOfResidence: null,
        medicalReport: null,
        cadernetaVacinacao: null
    };

    currentStep = 1;
    document.querySelectorAll('input, select, textarea').forEach(field => {
        field.value = '';
        field.classList.remove('error');
    });
    document.querySelectorAll('.file-name').forEach(fn => fn.style.display = 'none');
    document.querySelectorAll('.upload-area').forEach(area => area.classList.remove('has-file'));
    document.querySelectorAll('.file-input').forEach(fi => fi.value = '');
    document.querySelectorAll('.error-message').forEach(msg => msg.classList.remove('show'));
    updateUI();
}

document.getElementById('prof-cpf').addEventListener('input', (e) => {
    e.target.value = formatCPF(e.target.value);
});

document.getElementById('patient-cpf').addEventListener('input', (e) => {
    e.target.value = formatCPF(e.target.value);
});

document.getElementById('prof-phone').addEventListener('input', (e) => {
    e.target.value = formatPhone(e.target.value);
});

// DOCUMENTO COM FOTO
document.getElementById('file-photo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const fileNameDiv = document.getElementById('filename-photo');
    if (file) {
        formData.documentation.photoDocument = file; // GUARDA O FICHEIRO REAL
        document.getElementById('filename-photo-text').textContent = file.name;
        fileNameDiv.style.display = 'flex';
        document.getElementById('upload-photo').classList.add('has-file');
    }
});

// COMPROVANTE DE RESIDÊNCIA
document.getElementById('file-residence').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const fileNameDiv = document.getElementById('filename-residence');
    if (file) {
        formData.documentation.proofOfResidence = file; // GUARDA O FICHEIRO REAL
        document.getElementById('filename-residence-text').textContent = file.name;
        fileNameDiv.style.display = 'flex';
        document.getElementById('upload-residence').classList.add('has-file');
    }
});

// CADERNETA DE VACINAÇÃO
document.getElementById('file-caderneta').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const fileNameDiv = document.getElementById('filename-caderneta');
    if (file) {
        formData.documentation.cadernetaVacinacao = file; // GUARDA O FICHEIRO REAL
        document.getElementById('filename-caderneta-text').textContent = file.name;
        fileNameDiv.style.display = 'flex';
        document.getElementById('upload-caderneta').classList.add('has-file');
    }
});

// LAUDO MÉDICO
document.getElementById('file-medical').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const fileNameDiv = document.getElementById('filename-medical');
    if (file) {
        formData.documentation.medicalReport = file; // GUARDA O FICHEIRO REAL
        document.getElementById('filename-medical-text').textContent = file.name;
        fileNameDiv.style.display = 'flex';
        document.getElementById('upload-medical').classList.add('has-file');
    }
});