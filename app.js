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

function submitForm() {
    // 1. Valida a última etapa (Documentos)
    if (!validateCurrentStep()) return;

    // 2. Seleciona o botão e o formulário
    const btn = document.querySelector('button[onclick="submitForm()"]');
    const formElement = document.getElementById('vacinacaoForm');

    // 3. Trava de segurança (Impede os 3 envios)
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerHTML = '<span>Enviando...</span>';

    // 4. Cria o pacote de dados direto dos inputs do formulário
    const formDataObj = new FormData(formElement);

    // 5. Envio ÚNICO para o n8n
    fetch("https://pei-pernambuco.app.n8n.cloud/webhook/formulario-de-solicitacao", {
        method: 'POST',
        body: formDataObj
    })
        .then(response => {
            if (response.ok) {
                // Sucesso!
                currentStep = 4;
                updateUI();

                // Preenche a tela de confirmação com os dados dos inputs
                document.getElementById('confirmation-prof-name').textContent = document.getElementById('prof-fullname').value;
                document.getElementById('confirmation-patient-name').textContent = document.getElementById('patient-fullname').value;
                document.getElementById('confirmation-date').textContent = new Date().toLocaleDateString('pt-BR');
            } else {
                throw new Error("Erro no servidor");
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert("Houve um problema no envio. O botão será liberado.");
            btn.disabled = false;
            btn.innerHTML = 'Enviar Solicitação';
        });
}

function startNewForm() {
    resetForm();
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

document.getElementById('file-photo').addEventListener('change', (e) => {
    const fileName = e.target.files[0]?.name;
    const fileNameDiv = document.getElementById('filename-photo');
    if (fileName) {
        document.getElementById('filename-photo-text').textContent = fileName;
        fileNameDiv.style.display = 'flex';
        document.getElementById('upload-photo').classList.add('has-file');
    }
});

document.getElementById('file-residence').addEventListener('change', (e) => {
    const fileName = e.target.files[0]?.name;
    const fileNameDiv = document.getElementById('filename-residence');
    if (fileName) {
        document.getElementById('filename-residence-text').textContent = fileName;
        fileNameDiv.style.display = 'flex';
        document.getElementById('upload-residence').classList.add('has-file');
    }
});

document.getElementById('file-caderneta').addEventListener('change', (e) => {
    const fileName = e.target.files[0]?.name;
    const fileNameDiv = document.getElementById('filename-caderneta');
    if (fileName) {
        document.getElementById('filename-caderneta-text').textContent = fileName;
        fileNameDiv.style.display = 'flex';
        document.getElementById('upload-caderneta').classList.add('has-file');
    }
});

document.getElementById('file-medical').addEventListener('change', (e) => {
    const fileName = e.target.files[0]?.name;
    const fileNameDiv = document.getElementById('filename-medical');
    if (fileName) {
        document.getElementById('filename-medical-text').textContent = fileName;
        fileNameDiv.style.display = 'flex';
        document.getElementById('upload-medical').classList.add('has-file');
    }
});