const SUPABASE_URL = 'https://hppmslrkwagfhqdtwbbk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwcG1zbHJrd2FnZmhxZHR3YmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjU1NzYsImV4cCI6MjA4NjMwMTU3Nn0.R4hTQb4vJeFDlm3dscvZQVFd7xyR9c0ssrJwhc_pa1M';

let baseDados = [];
let paginaAtual = 0;
const itensPorPagina = 10;


/**
 * HELPER: Comunicação unificada com o Supabase
 */
async function supabaseRequest(tabela, metodo = 'GET', dados = null, params = '') {
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
    };

    const config = { method: metodo, headers };
    if (dados) config.body = JSON.stringify(dados);

    const url = `${SUPABASE_URL}/rest/v1/${tabela}${params.trim()}`;

    // Se o login falhar (401 ou 404), tratamos aqui
    const res = await fetch(url, config);

    // ADICIONE ESTE BLOCO AQUI:
    if (!res.ok) {
        const erroDetalhado = await res.json();
        console.error("🚨 ERRO REAL DO SUPABASE:", erroDetalhado.message);
        console.error("🚨 DETALHE:", erroDetalhado.hint || erroDetalhado.details);
        throw new Error(erroDetalhado.message);
    }

    const texto = await res.text();
    const corpo = texto ? JSON.parse(texto) : [];

    const range = res.headers.get('content-range');
    const totalGeral = range ? parseInt(range.split('/')[1]) : (Array.isArray(corpo) ? corpo.length : 0);

    return { dados: corpo, total: totalGeral };
}

/**
 * REGISTRO DE DOSES (Tabela: doses)
 */
function mascaraCPF(i) {
    let v = i.value;
    v = v.replace(/\D/g, ""); // Remove tudo que não é dígito
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    i.value = v;
}

/**
 * Aplica máscara de CNS (000 0000 0000 0000)
 * @param {HTMLInputElement} input 
 */
function mascaraCNS(input) {
    let v = input.value.replace(/\D/g, ''); // Remove tudo o que não é dígito

    if (v.length > 15) v = v.slice(0, 15); // Limita a 15 números

    // Aplica a formatação com espaços
    if (v.length > 11) {
        v = v.replace(/^(\d{3})(\d{4})(\d{4})(\d{4}).*/, '$1 $2 $3 $4');
    } else if (v.length > 7) {
        v = v.replace(/^(\d{3})(\d{4})(\d{4}).*/, '$1 $2 $3');
    } else if (v.length > 3) {
        v = v.replace(/^(\d{3})(\d{4}).*/, '$1 $2');
    }

    input.value = v;
}

async function enviarDadosUnidade() {
    const perfilAtivo = sessionStorage.getItem("perfilAtivo");
    if (!perfilAtivo) return alert("❌ Sessão expirada. Por favor, faça login novamente.");

    const perfil = JSON.parse(perfilAtivo);

    // 1. Captura individual dos valores
    const nome = document.getElementById("dose-paciente").value.trim();
    const cpf = document.getElementById("dose-cpf").value.trim();
    const cns = document.getElementById("dose-cns").value.trim();
    const nasc = document.getElementById("dose-nascimento").value;
    const pesoSelecionado = document.getElementById("dose-peso").value;
    const lote = document.getElementById("dose-lote").value.trim();
    const tipo = document.getElementById("dose-tipo").value;
    const dataApl = document.getElementById("dose-data").value;
    const via = document.getElementById("dose-via").value;
    const local = document.getElementById("dose-local").value;
    const cid = document.getElementById("dose-cid").value.trim();

    // 2. Validação: CPF ou CNS devem estar presentes (ajuste conforme sua regra)
    if (!nome || !nasc || !pesoSelecionado || !lote || !tipo || !dataApl || !via || !local || !cid) {
        return alert("⚠️ Por favor, preencha todos os campos obrigatórios.");
    }

    // 3. Montagem do objeto (Ajustado com os nomes de colunas do seu perfil)
    const dadosForm = {
        paciente_nome: nome,
        paciente_cpf: cpf,
        paciente_cns: cns,
        paciente_nascimento: nasc,
        paciente_peso: pesoSelecionado,
        lote: lote,
        tipo_dose: tipo,
        data_aplicacao: dataApl,
        via: via,
        local_aplicacao: local,
        cid: cid,
        // 🔥 AJUSTE AQUI: Usando as chaves corretas do seu objeto de login
        unidade_nome: perfil.unidade_saude || "Não informada",
        municipio_nome: perfil.municipio || "Não informado",
        profissional_nome: perfil.username || "Desconhecido",
        data_submissao: new Date().toISOString()
    };

    const btn = document.querySelector(".btn-salvar");
    const originalText = btn.innerText;

    try {
        btn.innerText = "⏳ Gravando...";
        btn.disabled = true;

        const res = await supabaseRequest('doses', 'POST', dadosForm);

        if (!res.erro) {
            mostrarNotificacao("Dados da Enviado:", "success");
            const form = document.getElementById("form-unidade-saude");
            if (form) form.reset();

            // Atualiza a tabela se a função existir
            if (typeof carregarRelatorio === "function") {
                await carregarRelatorio(perfil);
            }
        } else {
            throw new Error(res.erro.message);
        }
    } catch (e) {
        alert("❌ Erro ao salvar no banco: " + e.message);
        console.error("Erro no envio:", e);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

/**
 * NAVEGAÇÃO: Controla a exibição das seções (SPA Style)
 */
function alternarTela(tela) {
    // 1. Mapeamento dos blocos principais
    const secoes = {
        gestor: document.getElementById("sessao-gestor-estadual"),
        aprovacao: document.getElementById("area-aprovacao-acesso"),
        unidade: document.getElementById("sessao-unidade-saude"), // ID exato do HTML
        stats: document.querySelector(".stats"),
        busca: document.querySelector(".search-container"),
        tabelaRelatorio: document.querySelector(".table-card"),
        paginacao: document.querySelector(".pagination-control")
    };

    // 2. RESET: Esconde tudo
    Object.values(secoes).forEach(el => {
        if (el) el.style.display = "none";
    });

    // 3. LOGICA DE EXIBIÇÃO
    if (tela === 'unidade') {
        if (secoes.unidade) {
            secoes.unidade.style.display = "block";
            secoes.excelDoses.style.display = "flex"
            secoes.excelSolicitacoes.style.display = "none"
        } else {
            console.error("❌ Erro: Elemento 'sessao-unidade-saude' não encontrado!");
        }
    }
    else if (tela === 'relatorios') {
        if (secoes.stats) secoes.stats.style.display = "grid";
        if (secoes.busca) secoes.busca.style.display = "block";
        if (secoes.tabelaRelatorio) secoes.tabelaRelatorio.style.display = "block";
        if (secoes.paginacao) secoes.paginacao.style.display = "flex";
    }
    else if (tela === 'configuracoes' || tela === 'gestor') {
        if (secoes.gestor) secoes.gestor.style.display = "block";
        if (secoes.aprovacao) secoes.aprovacao.style.display = "block";
    }

    // 4. Update Sidebar Active
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
}

/**
 * BUSCAR DADOS E ATUALIZAR TABELA
 */
async function carregarRelatorio(perfil) {
    if (!perfil) return;

    try {
        const offset = paginaAtual * itensPorPagina;
        let params = `?select=*&order=data_submissao.desc&offset=${offset}&limit=${itensPorPagina}`;

        // --- LÓGICA DE FILTROS POR PERFIL ---
        if (perfil.role === 'municipio') {
            params += `&prof_municipio=eq.${encodeURIComponent(perfil.municipio)}`;
        }
        else if (perfil.role === 'unidade') {
            params += `&prof_estabelecimento=eq.${encodeURIComponent(perfil.unidade_saude)}`;
        }
        // 🔥 NOVO: Filtro para o Gestor Regional
        else if (perfil.role === 'regional') {
            params += `&prof_regional=eq.${encodeURIComponent(perfil.regional)}`;
        }

        const resultado = await supabaseRequest('solicitacoes', 'GET', null, params);

        if (resultado.dados) {
            // 🔥 ESSA LINHA É A CHAVE: Ela alimenta a variável que o Excel usa
            window.baseDados = resultado.dados;
        }
        renderizarTabela(window.baseDados);


        // 1. Renderiza apenas os 10 da página na tabela
        renderizarTabela(resultado.dados || []);

        // 2. Busca o total de todos (19, 50, 100...) para os cards
        buscarTotaisGerais(perfil);

        atualizarInterfacePaginacao(resultado.dados.length, resultado.total);

    } catch (error) {
        console.error("Erro no dashboard:", error);
    }
}
/**
 * RENDERIZAR TABELA: Popula o corpo da tabela com dados do Supabase
 */

function renderizarTabela(dados, perfil) {
    const corpoTabela = document.getElementById('tabela-corpo');
    if (!corpoTabela) return;

    // 1. Limpa a tabela antes de preencher para não duplicar dados
    corpoTabela.innerHTML = '';

    if (!dados || dados.length === 0) {
        corpoTabela.innerHTML = '<tr><td colspan="20" style="text-align:center;">Nenhuma solicitação encontrada no banco.</td></tr>';
        return;
    }

    const dadosLimitados = dados.slice(0, 10);

    // 2. Itera sobre cada solicitação vinda do Supabase
    dadosLimitados.forEach(item => {
        // Formatação de datas para o padrão brasileiro
        const dataNasc = item.paciente_nascimento ? new Date(item.paciente_nascimento).toLocaleDateString('pt-BR') : '---';
        const dataSub = item.data_submissao ? new Date(item.data_submissao).toLocaleDateString('pt-BR') : '---';
        const dataEnt = item.data_entrada ? new Date(item.data_entrada).toLocaleDateString('pt-BR') : '---';
        const temFoto = (item.url_documento_foto || item.doc_foto) ? '✅' : '❌';
        const temResidencia = (item.url_comprovante_residencia || item.doc_residencia) ? '✅' : '❌';
        const temCaderneta = (item.url_caderneta || item.doc_caderneta) ? '✅' : '❌';
        const temLaudo = (item.url_laudo_medico || item.doc_laudo) ? '✅' : '❌';

        const tr = document.createElement('tr');
        const statusAtual = (item.status || 'Pendente').toLowerCase();

        // 3. Monta a linha seguindo a ordem exata das suas <th> no HTML
        tr.innerHTML = `
            <td style="width: 140px;">
                <div class="status-container">
                    <select class="status-select status-${statusAtual}"                         
                            onchange="atualizarEstiloESalvar('${item.id}', this)">
                        <option value="Pendente" ${item.status === 'Pendente' ? 'selected' : ''}> Pendente</option>
                        <option value="Aprovado" ${item.status === 'Aprovado' ? 'selected' : ''}> Aprovado</option>
                        <option value="Reprovado" ${item.status === 'Reprovado' ? 'selected' : ''}> Não há indicação</option>
                        <option value="Aplicada" ${item.status === 'Aplicada' ? 'selected' : ''}> Dose Aplicada</option>
                        <option value="Duplicidade" ${item.status === 'Duplicidade' ? 'selected' : ''}> Duplicade/Erro </option>
                    </select>
                </div>
            </td>
            <td>${item.prof_nome || '---'}</td>
            <td>${item.prof_cpf || '---'}</td>
            <td>${item.prof_email || '---'}</td>
            <td>${item.prof_telefone || '---'}</td>
            <td>${item.prof_regional || '---'}</td>
            <td>${item.prof_municipio || '---'}</td>
            <td>${item.prof_estabelecimento || '---'}</td>
            <td><strong>${item.paciente_nome || '---'}</strong></td>
            <td>${item.paciente_cpf || '---'}</td>
            <td>${item.paciente_cns || '---'}</td>
            <td>${dataNasc}</td>
            <td>${dataEnt}</td>
            <td>${item.paciente_regional || '---'}</td>
            <td>${item.paciente_municipio || '---'}</td>
            <td>${item.paciente_condicao || '---'}</td>
            <td>${item.paciente_peso || '---'}</td>
            <td>
                ${temFoto ? `<a href="${item.url_documento_foto}" target="_blank"><i class="fa-solid fa-box-archive"></i></a>` : '❌'}
            </td>
            <td>
                ${temResidencia ? `<a href="${item.url_comprovante_residencia}" target="_blank"><i class="fa-solid fa-box-archive"></i></a>` : '❌'}
            </td>
            <td>
                ${temCaderneta ? `<a href="${item.url_caderneta}" target="_blank"><i class="fa-solid fa-box-archive"></i></a>` : '❌'}
            </td>
            <td>
                ${temLaudo ? `<a href="${item.url_laudo_medico}" target="_blank"><i class="fa-solid fa-box-archive"></i></a>` : '❌'}
            </td>
            <td>${dataSub}</td>
        `;
        corpoTabela.appendChild(tr);
    });
}


// Exemplo de como você deve chamar no seu fluxo:
async function inicializarDashboard(perfil) {
    const dados = await carregarRelatorio(perfil); // Esta função já busca da tabela 'solicitacoes'
    renderizarTabela(dados);
}

/**
 * ATUALIZAR STATUS NO BANCO
 */
async function alterarStatusBanco(id, novoStatus) {
    try {
        const payload = { status: novoStatus };
        const params = `?id=eq.${id}`;

        const resultado = await supabaseRequest('solicitacoes', 'PATCH', payload, params);

        // Recarrega os totais e a tabela para refletir a mudança nos cards
        const perfil = JSON.parse(sessionStorage.getItem("perfilAtivo"));
        if (perfil) {
            carregarRelatorio(perfil);
        }
    } catch (error) {
        console.error("❌ Erro ao salvar status:", error);
    }
}

async function atualizarEstiloESalvar(id, elemento) {

    const perfilAtivo = JSON.parse(sessionStorage.getItem("perfilAtivo"));

    // 🔥 CONDIÇÃO DE SEGURANÇA: Se for Regional, bloqueia a execução
    if (perfilAtivo && perfilAtivo.role === 'regional') {
        mostrarNotificacao("Perfil de Consulta: Você não tem permissão para alterar o status.", "warning");
        // Reseta o select para o valor anterior (opcional, já que usamos disabled, mas reforça a segurança)
        location.reload();
        return;
    }
    const novoStatus = elemento.value;

    // 1. LIMPEZA TOTAL das classes de cor anteriores
    elemento.classList.remove('status-pendente', 'status-aprovado', 'status-reprovado', 'status-aplicada', 'status-duplicidade');

    // 2. APLICAÇÃO da nova classe (isso muda a cor na hora)
    elemento.classList.add(`status-${novoStatus.toLowerCase()}`);

    mostrarNotificacao(`Status alterado para ${novoStatus}`, "success");

    // 3. SALVAMENTO no banco
    await alterarStatusBanco(id, novoStatus);
}

/**
 * ATUALIZAR DASHBOARD: Calcula os totais e exibe nos cards
 */
function atualizarCardsEstatisticas(dadosNaPagina, totalGeral) {
    // Para o Total Geral, usamos o valor real do banco
    const elTotal = document.getElementById('stat-total');
    if (elTotal) elTotal.innerText = totalGeral;

    // Para Pendentes e Aprovados: 
    // Se quiser o total real do BANCO (dos 19), você precisaria de um SELECT sem limit.
    // Por enquanto, vamos contar o que está visível para garantir que não fique "0":
    const pendentes = dadosNaPagina.filter(item => item.status === 'Pendente').length;
    const aprovados = dadosNaPagina.filter(item => item.status === 'Aprovado').length;

    const elPendentes = document.getElementById('stat-pendentes');
    const elAprovados = document.getElementById('stat-aprovados');

    if (elPendentes) elPendentes.innerText = pendentes;
    if (elAprovados) elAprovados.innerText = aprovados;
}

function proximaPagina() {
    paginaAtual++;
    const perfil = JSON.parse(sessionStorage.getItem("perfilAtivo"));
    carregarRelatorio(perfil);
}

function paginaAnterior() {
    if (paginaAtual > 0) {
        paginaAtual--;
        const perfil = JSON.parse(sessionStorage.getItem("perfilAtivo"));
        carregarRelatorio(perfil);
    }
}

function atualizarControlesPaginacao(quantidadeNaPagina) {
    const btnAnterior = document.getElementById('btn-anterior');
    const btnProximo = document.getElementById('btn-proximo');
    const txtPagina = document.getElementById('num-pagina');

    if (btnAnterior) btnAnterior.disabled = (paginaAtual === 0);
    // Se vierem menos itens que o limite, não há próxima página
    if (btnProximo) btnProximo.disabled = (quantidadeNaPagina < itensPorPagina);
    if (txtPagina) txtPagina.innerText = `Página ${paginaAtual + 1}`;
}

function atualizarInterfacePaginacao(totalNaPagina, totalGeral) {
    const btnAnt = document.getElementById('btn-anterior');
    const btnProx = document.getElementById('btn-proximo');
    const txtPag = document.getElementById('num-pagina');

    const totalPaginas = Math.ceil(totalGeral / itensPorPagina);

    if (btnAnt) btnAnt.disabled = (paginaAtual === 0);
    if (btnProx) btnProx.disabled = (paginaAtual + 1 >= totalPaginas || totalNaPagina < itensPorPagina);

    if (txtPag) txtPag.innerText = `Página ${paginaAtual + 1} de ${totalPaginas || 1}`;
}

async function buscarTotaisGerais(perfil) {
    try {
        // Buscamos apenas a coluna 'status' de todos os registros para contar
        let params = "?select=status";

        if (perfil.role === 'municipio') {
            params += `&prof_municipio=eq.${encodeURIComponent(perfil.municipio)}`;
        } else if (perfil.role === 'regional') {
            params += `&prof_regional=eq.${encodeURIComponent(perfil.regional)}`;
        } else if (perfil.role === 'unidade') {
            params += `&prof_estabelecimento=eq.${encodeURIComponent(perfil.unidade)}`;
        }

        const res = await supabaseRequest('solicitacoes', 'GET', null, params);
        const todosOsDados = res.dados || [];

        const stats = {
            total: todosOsDados.length,
            pendentes: todosOsDados.filter(i => i.status === 'Pendente').length,
            aprovados: todosOsDados.filter(i => i.status === 'Aprovado').length
        };

        // Atualiza os cards com os números reais do banco todo
        document.getElementById('stat-total').innerText = stats.total;
        document.getElementById('stat-pendentes').innerText = stats.pendentes;
        document.getElementById('stat-aprovados').innerText = stats.aprovados;
    } catch (error) {
        console.error("❌ Erro ao buscar totais:", error);
    }
}

async function exportarSolicitacoesParaExcel() {
    // 1. Recupera o perfil para aplicar o filtro correto
    const perfil = JSON.parse(sessionStorage.getItem("perfilAtivo"));
    if (!perfil) return alert("Sessão expirada!");

    // 2. Define o filtro baseado no perfil (igual à lógica do carregarRelatorio)
    let params = "?select=*";
    if (perfil.role === 'unidade') {
        params += `&unidade_saude=eq.${encodeURIComponent(perfil.unidade_saude)}`;
    } else if (perfil.role === 'municipio') {
        params += `&prof_municipio=eq.${encodeURIComponent(perfil.municipio)}`;
    } else if (perfil.role === 'regional') {
        params += `&prof_regional=eq.${encodeURIComponent(perfil.regional)}`;
    }

    try {
        // 3. Busca TODOS os dados (sem limitar a 10 itens)
        const resultado = await supabaseRequest('solicitacoes', 'GET', null, params);
        const todosDados = resultado.dados || [];

        if (todosDados.length === 0) {
            return alert("⚠️ Não há dados para exportar.");
        }

        // 4. Definição dos Cabeçalhos
        const cabecalho = [
            "Status", "Profissional", "CPF Prof.", "Email", "Telefone", "Regional Prof.", "Município Prof.", "Estabelecimento",
            "Paciente", "CPF Paciente", "CNS Paciente", "Data Nasc.", "Data de Entrada Solicitação", "Regional Pac.", "Município Pac.", "CID", "Peso",
            "Link Foto", "Link Residência", "Link Caderneta", "Link Laudo", "Data Submissão"
        ];

        // 5. Mapeamento das Linhas
        const linhas = todosDados.map(item => {
            const dataNasc = item.paciente_nascimento ? new Date(item.paciente_nascimento).toLocaleDateString('pt-BR') : '---';
            const dataSub = item.data_submissao ? new Date(item.data_submissao).toLocaleDateString('pt-BR') : '---';
            const dataEnt = item.data_entrada ? new Date(item.data_entrada).toLocaleDateString('pt-BR') : '---';

            return [
                item.status || '---',
                item.prof_nome || '---',
                item.prof_cpf || '---',
                item.prof_email || '---',
                item.prof_telefone || '---',
                item.prof_regional || '---',
                item.prof_municipio || '---',
                item.prof_estabelecimento || '---',
                item.paciente_nome || '---',
                item.paciente_cpf || '---',
                item.paciente_cns || '---',
                dataNasc,
                dataEnt,
                item.paciente_regional || '---',
                item.paciente_municipio || '---',
                item.paciente_condicao || '---',
                item.paciente_peso ? item.paciente_peso + 'kg' : '---',
                item.url_documento_foto || 'N/A',
                item.url_comprovante_residencia || 'N/A',
                item.url_caderneta || 'N/A',
                item.url_laudo_medico || 'N/A',
                dataSub
            ].map(val => `"${String(val).replace(/;/g, ',')}"`).join(";");
        });

        // 6. Geração do Arquivo
        const conteudoCSV = "\ufeff" + cabecalho.join(";") + "\n" + linhas.join("\n");
        const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `Relatorio_Completo_${new Date().getTime()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        mostrarNotificacao(` Exportação concluída.`);

    } catch (error) {
        console.error("Erro na exportação:", error);
        mostrarNotificacao("Erro ao buscar dados para exportação.");
    }
}

function filtrarPorCPF() {
    const inputCPF = document.getElementById('filtro-cpf-paciente');

    // Verificação de segurança para evitar o erro "Cannot read properties of null"
    if (!inputCPF) {
        console.error("❌ Elemento 'filtro-cpf-paciente' não encontrado no HTML.");
        return;
    }

    const termoBusca = inputCPF.value.replace(/\D/g, '');

    // ... restante da lógica de filtro
    const dadosParaFiltrar = window.baseDados || baseDados;

    if (!termoBusca) {
        renderizarTabela(dadosParaFiltrar);
        return;
    }

    const filtrados = dadosParaFiltrar.filter(item => {
        const cpfLimpo = (item.paciente_cpf || "").replace(/\D/g, '');
        return cpfLimpo.includes(termoBusca);
    });

    renderizarTabela(filtrados);
}

async function exportarDosesPorUnidade() {
    try {
        // 1. Pegamos o perfil do usuário logado no sessionStorage
        const perfil = JSON.parse(sessionStorage.getItem("perfilAtivo"));

        if (!perfil || perfil.role !== 'unidade') {
            return mostrarNotificacao("Ação permitida apenas para perfis de Unidade de Saúde.", "warning");
        }

        // 2. Filtramos as doses onde 'estabelecimento' ou 'unidade_nome' coincide com o perfil
        // Ajuste o nome da coluna ('estabelecimento') conforme o seu banco na tabela 'Doses'
        const params = `?unidade_nome=eq.${encodeURIComponent(perfil.unidade_saude)}&select=*`;
        const resultado = await supabaseRequest('doses', 'GET', null, params);
        const dados = resultado.dados || [];

        if (dados.length === 0) {
            return mostrarNotificacao("Nenhuma dose registrada encontrada para esta unidade.", "warning");
        }

        // 3. Montagem do CSV
        const cabecalho = [
            "Id", "Paciente", "CPF", "Data Nasc.", "Peso", "Lote", "Tipo de Dose", "Via de Administração", "Local de Aplicação", "CID", "Data Aplicação", "Profissional"
        ];

        const linhas = dados.map(item => {
            const dataNasc = item.paciente_nascimento ? new Date(item.paciente_nascimento).toLocaleDateString('pt-BR') : '---';
            const dataApl = item.data_aplicacao ? new Date(item.data_aplicacao).toLocaleDateString('pt-BR') : '---';

            return [
                item.id || '---',
                item.paciente_nome || '---',
                item.paciente_cpf || '---',
                dataNasc,
                item.paciente_peso || '---',
                item.lote || '---',
                item.tipo_dose || '---',
                item.via || '---',
                item.local_aplicacao || '---',
                item.cid || '---',
                dataApl,
                item.profissional_nome || '---'
            ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(";");
        });

        // 4. Download do arquivo
        const conteudoCSV = "\ufeff" + cabecalho.join(";") + "\n" + linhas.join("\n");
        const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        const nomeFormatado = perfil.unidade_saude.replace(/\s+/g, '_');
        link.download = `Doses_Aplicadas_${nomeFormatado}.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        mostrarNotificacao(` Exportação concluída.`);

    } catch (error) {
        console.error("Erro na exportação:", error);
        mostrarNotificacao("Ocorreu um erro ao gerar o arquivo.", "error");
    }
}

async function exportarDosesPorMunicipio() {
    try {
        // 1. Pegamos o perfil do usuário logado no sessionStorage
        const perfil = JSON.parse(sessionStorage.getItem("perfilAtivo"));

        if (!perfil || perfil.role !== 'municipio') {
            return mostrarNotificacao("Ação permitida apenas para perfis de Gestor Municipal.", "warning");
        }

        // 2. Filtramos as doses onde 'estabelecimento' ou 'unidade_nome' coincide com o perfil
        // Ajuste o nome da coluna ('estabelecimento') conforme o seu banco na tabela 'Doses'
        const params = `?municipio_nome=eq.${encodeURIComponent(perfil.municipio)}&select=*`;
        const resultado = await supabaseRequest('doses', 'GET', null, params);
        const dados = resultado.dados || [];

        if (dados.length === 0) {
            return mostrarNotificacao(" Nenhuma dose registrada encontrada para este município.", "warning");
        }

        // 3. Montagem do CSV
        const cabecalho = [
            "Id", "Peso", "Lote", "Tipo de Dose", "Via de Administração", "Local de Aplicação", "CID", "Data Aplicação", "Município de Ocorrência", "Estabelecimento de Ocorrência", "Profissional"
        ];

        const linhas = dados.map(item => {
            const dataApl = item.data_aplicacao ? new Date(item.data_aplicacao).toLocaleDateString('pt-BR') : '---';

            return [
                item.id || '---',
                item.paciente_peso || '---',
                item.lote || '---',
                item.tipo_dose || '---',
                item.via || '---',
                item.local_aplicacao || '---',
                item.cid || '---',
                dataApl,
                item.municipio_nome || '---',
                item.unidade_nome || '---',
                item.profissional_nome || '---'
            ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(";");
        });

        // 4. Download do arquivo
        const conteudoCSV = "\ufeff" + cabecalho.join(";") + "\n" + linhas.join("\n");
        const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        const nomeFormatado = perfil.municipio.replace(/\s+/g, '_');
        link.download = `Doses_Aplicadas_${nomeFormatado}.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        mostrarNotificacao(` Exportação concluída.`);

    } catch (error) {
        console.error("Erro na exportação:", error);
        mostrarNotificacao("Ocorreu um erro ao gerar o arquivo.", "error");
    }
}

// Substitui o alert()
function mostrarNotificacao(mensagem, tipo = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;

    const icones = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        warning: 'fa-triangle-exclamation'
    };

    toast.innerHTML = `
        <i class="fa-solid ${icones[tipo]}"></i>
        <span>${mensagem}</span>
    `;

    container.appendChild(toast);

    // Remove automaticamente após 4 segundos
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s ease-in forwards';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// Substitui o console.log() simples por um estilizado
const logger = {
    info: (msg, data = '') => console.log(`%cℹ️ [INFO]: ${msg}`, 'color: #3b82f6; font-weight: bold', data),
    success: (msg, data = '') => console.log(`%c✅ [SUCESSO]: ${msg}`, 'color: #10b981; font-weight: bold', data),
    error: (msg, data = '') => console.log(`%c🚨 [ERRO]: ${msg}`, 'color: #ef4444; font-weight: bold', data)
};