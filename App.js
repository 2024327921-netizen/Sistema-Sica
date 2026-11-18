
import React, { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  AppState,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const supabase = createClient(
  'https://nijymkrgtvljsvdsqdfm.supabase.co',
  'sb_publishable_Mn-NkE5fSoVira0TLSNFWA_1F1YX8GL',
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

const GREEN = '#159600';
const DARK = '#104b08';

const TYPES = [
  'Uniforme',
  'Atraso',
  'Conduta inadequada',
];

const LEVELS = ['Baixa', 'Média', 'Alta'];
const MEASURES = ['Verbal', 'Escrita', 'Suspensão'];

const keyFor = (uid, part) =>
  `sica_offline_v3_${uid}_${part}`;

function errorText(e) {
  return e?.message || String(e);
}

function nowLocal() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');

  return {
    date:
      `${d.getFullYear()}-` +
      `${p(d.getMonth() + 1)}-` +
      `${p(d.getDate())}`,
    time:
      `${p(d.getHours())}:` +
      `${p(d.getMinutes())}:` +
      `${p(d.getSeconds())}`,
    entry:
      `${p(d.getHours())}:` +
      `${p(d.getMinutes())}`,
  };
}

function dateBR(value) {
  if (!value) return '—';
  const parts = String(value).split('-');

  return parts.length === 3
    ? `${parts[2]}/${parts[1]}/${parts[0]}`
    : String(value);
}

function timeBR(value) {
  return value ? String(value).slice(0, 5) : '—';
}

function safeHTML(value) {
  return String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function yesNo(value) {
  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  return '—';
}

function countType(rows, type) {
  return rows.filter(r => r.tipo === type).length;
}


function createOfflineId() {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;

    const hex = Array.from(bytes, b =>
      b.toString(16).padStart(2, '0')
    ).join('');

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20)
    ].join('-');
  }

  // Identificador local de compatibilidade.
  // Não deve ser utilizado como token de segurança.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, c => {
      const r = Math.floor(Math.random() * 16);
      const v = c === 'x' ? r : (r & 3) | 8;
      return v.toString(16);
    });
}


async function readJSON(key, fallback) {
  const raw = await AsyncStorage.getItem(key);

  if (raw === null) return fallback;

  return JSON.parse(raw);
}

async function writeJSON(key, value) {
  await AsyncStorage.setItem(
    key,
    JSON.stringify(value)
  );
}

function buildPDF(student, records, names) {
  const sections = records.map((r, i) => `
    <section>
      <h3>${i + 1}. ${safeHTML(r.tipo)}</h3>
      <p><b>Data:</b> ${safeHTML(dateBR(r.data))}</p>
      <p><b>Horário:</b> ${safeHTML(timeBR(r.horario))}</p>
      <p><b>Nível:</b> ${safeHTML(r.nivel)}</p>
      <p><b>Medida:</b> ${safeHTML(r.medida)}</p>
      <p><b>Assistente:</b>
        ${safeHTML(
          names[r.registrado_por] || 'Não disponível'
        )}
      </p>

      ${
        r.tipo === 'Atraso'
          ? `<p><b>Entrada:</b>
               ${safeHTML(timeBR(r.horario_entrada))}
             </p>`
          : ''
      }

      ${
        r.tipo === 'Uniforme'
          ? `
            <p><b>Calça preta:</b>
              ${yesNo(r.calca_preta)}</p>
            <p><b>Blusa institucional:</b>
              ${yesNo(r.blusa_instituicao)}</p>
            <p><b>Sapato fechado:</b>
              ${yesNo(r.sapato_fechado)}</p>
          `
          : ''
      }

      <p><b>Descrição:</b>
        ${safeHTML(r.descricao || '—')}
      </p>
    </section>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4;
          margin: 18mm;
        }

        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.5;
          color: #222;
        }

        header {
          text-align: center;
          border-bottom: 3px solid #159600;
        }

        h1, h2, h3 {
          color: #104b08;
        }

        h1 {
          font-size: 27px;
        }

        section {
          border: 1px solid #ddd;
          padding: 12px;
          margin: 12px 0;
          page-break-inside: avoid;
        }

        .box {
          background: #f1f8ef;
          padding: 12px;
        }

        .signature {
          margin-top: 55px;
          text-align: center;
        }
      </style>
    </head>

    <body>
      <header>
        <h1>SICA</h1>
        <p>Sistema Integrado de Controle de Alunos</p>
        <h2>HISTÓRICO INDIVIDUAL</h2>
      </header>

      <h2>Identificação</h2>

      <div class="box">
        <p><b>Aluno:</b>
          ${safeHTML(student.nome)}</p>
        <p><b>Matrícula:</b>
          ${safeHTML(student.matricula)}</p>
        <p><b>Turma:</b>
          ${safeHTML(student.turma)}</p>
        <p><b>Turno:</b>
          ${safeHTML(student.turno)}</p>
      </div>

      <h2>Resumo</h2>

      <div class="box">
        <p><b>Total:</b> ${records.length}</p>
        ${TYPES.map(t => `
          <p><b>${safeHTML(t)}:</b>
            ${countType(records, t)}</p>
        `).join('')}
      </div>

      <h2>Ocorrências detalhadas</h2>

      ${
        sections ||
        '<p>Nenhuma ocorrência registrada.</p>'
      }

      <div class="signature">
        ______________________________________
        <p>Responsável pelo acompanhamento</p>
      </div>
    </body>
    </html>
  `;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [assistant, setAssistant] = useState(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const [screen, setScreen] = useState('login');
  const [page, setPage] = useState('home');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const [depeEmail, setDepeEmail] = useState('');
  const [codes, setCodes] = useState([]);
  const [generated, setGenerated] = useState('');

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] =
    useState(null);

  const [showStudents, setShowStudents] =
    useState(false);

  const [type, setType] = useState('Uniforme');
  const [level, setLevel] = useState('Baixa');
  const [measure, setMeasure] = useState('Verbal');

  const [description, setDescription] =
    useState('');

  const [entryTime, setEntryTime] =
    useState('');

  const [uniform, setUniform] = useState({
    calca_preta: false,
    blusa_instituicao: false,
    sapato_fechado: false,
  });

  const [occurrences, setOccurrences] =
    useState([]);

  const [individualRecords, setIndividualRecords] =
    useState(null);

  const [assistantNames, setAssistantNames] =
    useState({});

  const [pending, setPending] = useState([]);
  const [pendingDepe, setPendingDepe] =
    useState([]);

  const [connection, setConnection] =
    useState('checking');

  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [cacheReady, setCacheReady] = useState(false);

  const pendingRef = useRef([]);
  const depeRef = useRef([]);
  const studentsRef = useRef([]);

  const activeUserRef = useRef(null);
  const roleRef = useRef(null);

  const syncLockRef = useRef(false);
  const savingLockRef = useRef(false);
  const cacheReadyRef = useRef(false);

  const uid = session?.user?.id;

  function updatePending(value) {
    pendingRef.current = value;
    setPending(value);
  }

  function updateDepe(value) {
    depeRef.current = value;
    setPendingDepe(value);
  }

  function updateStudentsState(value) {
    studentsRef.current = value;
    setStudents(value);
  }

  async function persistPending(userId, value) {
    await writeJSON(
      keyFor(userId, 'pending'),
      value
    );

    if (activeUserRef.current === userId) {
      updatePending(value);
    }
  }

  async function persistDepe(userId, value) {
    await writeJSON(
      keyFor(userId, 'depe'),
      value
    );

    if (activeUserRef.current === userId) {
      updateDepe(value);
    }
  }

  async function persistStudents(userId, value) {
    await writeJSON(
      keyFor(userId, 'students'),
      value
    );

    if (activeUserRef.current === userId) {
      updateStudentsState(value);
    }
  }

  async function restoreCache(userId) {
    const [savedStudents, savedPending, savedDepe] =
      await Promise.all([
        readJSON(
          keyFor(userId, 'students'),
          []
        ),
        readJSON(
          keyFor(userId, 'pending'),
          []
        ),
        readJSON(
          keyFor(userId, 'depe'),
          []
        ),
      ]);

    if (activeUserRef.current !== userId) {
      return;
    }

    updateStudentsState(savedStudents);
    updatePending(savedPending);
    updateDepe(savedDepe);

    cacheReadyRef.current = true;
    setCacheReady(true);
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          setNotice(errorText(error));
        }

        setSession(data?.session || null);
        setLoading(false);
      })
      .catch(e => {
        if (active) {
          setNotice(errorText(e));
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (active) {
          setSession(nextSession);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function checkRole(userId) {
    const [adminResult, assistantResult] =
      await Promise.all([
        supabase
          .from('responsaveis_codigos')
          .select('usuario_id')
          .eq('usuario_id', userId)
          .maybeSingle(),

        supabase
          .from('assistentes')
          .select('id,nome,numero')
          .eq('id', userId)
          .maybeSingle(),
      ]);

    if (adminResult.error) {
      throw adminResult.error;
    }

    if (assistantResult.error) {
      throw assistantResult.error;
    }

    return {
      role: adminResult.data
        ? 'responsavel'
        : assistantResult.data
        ? 'assistente'
        : 'pendente',

      assistant: assistantResult.data || null,
    };
  }

  useEffect(() => {
    if (!uid) {
      activeUserRef.current = null;
      cacheReadyRef.current = false;

      setCacheReady(false);
      setRole(null);
      roleRef.current = null;
      setAssistant(null);

      updateStudentsState([]);
      updatePending([]);
      updateDepe([]);

      return;
    }

    let active = true;

    activeUserRef.current = uid;
    cacheReadyRef.current = false;

    setCacheReady(false);
    setLoading(true);

    (async () => {
      try {
        await restoreCache(uid);

        const cachedAccess = await readJSON(
          keyFor(uid, 'access'),
          null
        );

        if (
          active &&
          cachedAccess?.role === 'assistente'
        ) {
          setRole('assistente');
          roleRef.current = 'assistente';
          setAssistant(cachedAccess.assistant);
        }

        const result = await checkRole(uid);

        if (!active) return;

        setRole(result.role);
        roleRef.current = result.role;
        setAssistant(result.assistant);
        setConnection('online');

        await writeJSON(
          keyFor(uid, 'access'),
          result
        );
      } catch (e) {
        if (active) {
          setConnection('offline');

          setNotice(
            'Sem conexão para verificar o acesso. ' +
            'Se este dispositivo já foi autenticado, ' +
            'os dados locais poderão ser utilizados.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [uid]);

  async function run(fn) {
    if (busy) return;

    setBusy(true);
    setNotice('');

    try {
      await fn();
    } catch (e) {
      setNotice(
        'Atenção: ' + errorText(e)
      );
    } finally {
      setBusy(false);
    }
  }

  async function login() {
    await run(async () => {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) throw error;

      setNotice('Login realizado.');
    });
  }

  async function signup() {
    await run(async () => {
      if (
        !name.trim() ||
        !email.trim() ||
        !password ||
        !code.trim()
      ) {
        throw new Error(
          'Preencha todos os campos.'
        );
      }

      const normalized =
        code.replace(/\s/g, '');

      if (!/^[a-fA-F0-9]{32}$/.test(normalized)) {
        throw new Error(
          'Código individual inválido.'
        );
      }

      const { data, error } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

      if (error) throw error;

      if (!data.session) {
        setScreen('login');

        setNotice(
          'Conta criada. Faça login para ativar.'
        );

        return;
      }

      const { error: activationError } =
        await supabase.rpc(
          'sica_ativar_assistente',
          {
            p_nome: name.trim(),
            p_codigo: normalized,
          }
        );

      if (activationError) {
        throw activationError;
      }

      const result =
        await checkRole(data.session.user.id);

      setRole(result.role);
      roleRef.current = result.role;
      setAssistant(result.assistant);

      setNotice('Cadastro ativado!');
    });
  }

  async function activate() {
    await run(async () => {
      const normalized =
        code.replace(/\s/g, '');

      if (!name.trim()) {
        throw new Error('Informe seu nome.');
      }

      const { error } =
        await supabase.rpc(
          'sica_ativar_assistente',
          {
            p_nome: name.trim(),
            p_codigo: normalized,
          }
        );

      if (error) throw error;

      const result = await checkRole(uid);

      setRole(result.role);
      roleRef.current = result.role;
      setAssistant(result.assistant);

      await writeJSON(
        keyFor(uid, 'access'),
        result
      );

      setNotice('Acesso ativado!');
    });
  }

  async function logout() {
    await run(async () => {
      if (pendingRef.current.length > 0) {
        throw new Error(
          'Existem ocorrências pendentes. ' +
          'Sincronize antes de sair.'
        );
      }

      if (depeRef.current.length > 0) {
        throw new Error(
          'Existem verificações do DEPE pendentes. ' +
          'Conecte-se para concluir.'
        );
      }

      const { error } =
        await supabase.auth.signOut();

      if (error) throw error;

      setPage('home');
      setScreen('login');
      setPassword('');
      setNotice('Você saiu do SICA.');
    });
  }

  async function fetchStudentsOnline() {
    const all = [];
    const size = 500;

    for (let start = 0; ; start += size) {
      const { data, error } =
        await supabase
          .from('alunos')
          .select(
            'id,nome,matricula,turma,turno'
          )
          .order('nome', {
            ascending: true,
          })
          .order('id', {
            ascending: true,
          })
          .range(
            start,
            start + size - 1
          );

      if (error) throw error;

      all.push(...(data || []));

      if (!data || data.length < size) {
        break;
      }
    }

    return all;
  }

  async function refreshStudents() {
    if (!uid) return;

    try {
      const data =
        await fetchStudentsOnline();

      await persistStudents(uid, data);

      setConnection('online');
      setNotice(
        `${data.length} alunos atualizados.`
      );
    } catch (e) {
      setConnection('offline');

      if (!studentsRef.current.length) {
        setNotice(
          'Não foi possível atualizar os alunos. ' +
          'Conecte-se à internet uma vez para ' +
          'carregar a lista neste dispositivo.'
        );
      }
    }
  }

  useEffect(() => {
    if (
      role !== 'assistente' ||
      !uid ||
      !cacheReady
    ) {
      return;
    }

    refreshStudents();
  }, [role, uid, cacheReady]);

  function loadStudents() {
    setShowStudents(true);
    setPage('students');
    setSearch('');
    setNotice('');

    if (!studentsRef.current.length) {
      setNotice(
        'A lista de alunos ainda não está ' +
        'armazenada neste dispositivo. ' +
        'Conecte-se para atualizá-la.'
      );
    }
  }

  function openOccurrence(selectedType) {
    setType(selectedType);
    setSelectedStudent(null);
    setSearch('');
    setDescription('');
    setLevel('Baixa');
    setMeasure('Verbal');
    setEntryTime(nowLocal().entry);

    setUniform({
      calca_preta: false,
      blusa_instituicao: false,
      sapato_fechado: false,
    });

    setShowStudents(false);
    setPage('form');

    if (!studentsRef.current.length) {
      setNotice(
        'A lista de alunos não está disponível ' +
        'neste dispositivo. Conecte-se à internet ' +
        'para carregá-la antes de registrar.'
      );
    } else {
      setNotice('');
    }
  }

  async function addDepePending(
    userId,
    alunoId,
    occurrenceType
  ) {
    const exists = depeRef.current.some(
      x =>
        x.aluno_id === alunoId &&
        x.tipo === occurrenceType
    );

    if (exists) return;

    const next = [
      ...depeRef.current,
      {
        aluno_id: alunoId,
        tipo: occurrenceType,
      },
    ];

    await persistDepe(userId, next);
  }

  async function processDepeQueue(userId) {
    const items = [...depeRef.current];

    for (const item of items) {
      if (activeUserRef.current !== userId) {
        return;
      }

      const { data, error } =
        await supabase.functions.invoke(
          'sica-enviar-depe',
          {
            body: {
              aluno_id: item.aluno_id,
              tipo: item.tipo,
            },
          }
        );

      if (error || data?.erro) {
        throw error || new Error(data.erro);
      }

      const next = depeRef.current.filter(
        x =>
          !(
            x.aluno_id === item.aluno_id &&
            x.tipo === item.tipo
          )
      );

      await persistDepe(userId, next);
    }
  }

  async function syncPending() {
    const userId = activeUserRef.current;

    if (
      !userId ||
      !cacheReadyRef.current ||
      roleRef.current !== 'assistente' ||
      syncLockRef.current ||
      savingLockRef.current
    ) {
      return;
    }

    syncLockRef.current = true;
    setSyncing(true);

    try {
      const { data, error } =
        await supabase.auth.getUser();

      if (
        error ||
        data?.user?.id !== userId
      ) {
        throw new Error(
          'Sessão não confirmada.'
        );
      }

      const queue = [...pendingRef.current];

      for (const item of queue) {
        if (activeUserRef.current !== userId) {
          return;
        }

        const { data: result, error: rpcError } =
          await supabase.rpc(
            'sica_salvar_ocorrencia_offline',
            {
              p_registro: item,
            }
          );

        if (rpcError) throw rpcError;

        if (result?.salvo !== true) {
          throw new Error(
            'O servidor não confirmou o registro.'
          );
        }

        await addDepePending(
          userId,
          item.aluno_id,
          item.tipo
        );

        const remaining =
          pendingRef.current.filter(
            x =>
              x.offline_id !== item.offline_id
          );

        await persistPending(
          userId,
          remaining
        );
      }

      await processDepeQueue(userId);

      setConnection('online');
      setLastSync(
        new Date().toISOString()
      );
    } catch (e) {
      setConnection('offline');
    } finally {
      syncLockRef.current = false;
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (
      role !== 'assistente' ||
      !uid ||
      !cacheReady
    ) {
      return;
    }

    syncPending();

    const interval = setInterval(
      () => {
        syncPending();
      },
      15000
    );

    const subscription =
      AppState.addEventListener(
        'change',
        state => {
          if (state === 'active') {
            syncPending();
          }
        }
      );

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [role, uid, cacheReady]);

  async function saveOccurrence() {
    if (
      busy ||
      savingLockRef.current
    ) {
      return;
    }

    savingLockRef.current = true;
    setBusy(true);

    try {
      if (!selectedStudent) {
        throw new Error(
          'Selecione um aluno.'
        );
      }

      if (
        !uid ||
        roleRef.current !== 'assistente'
      ) {
        throw new Error(
          'Acesso não autorizado.'
        );
      }

      if (!cacheReadyRef.current) {
        throw new Error(
          'Aguarde o carregamento dos dados locais.'
        );
      }

      if (
        type === 'Conduta inadequada' &&
        !description.trim()
      ) {
        throw new Error(
          'Descreva a conduta inadequada.'
        );
      }

      if (
        type === 'Atraso' &&
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(
          entryTime.trim()
        )
      ) {
        throw new Error(
          'Informe a entrada no formato HH:MM.'
        );
      }

      const now = nowLocal();

      const record = {
        offline_id: createOfflineId(),
        aluno_id: selectedStudent.id,
        tipo: type,
        data: now.date,
        horario: now.time,
        nivel: level,
        medida: measure,
        descricao:
          description.trim() || null,

        calca_preta:
          type === 'Uniforme'
            ? uniform.calca_preta
            : null,

        blusa_instituicao:
          type === 'Uniforme'
            ? uniform.blusa_instituicao
            : null,

        sapato_fechado:
          type === 'Uniforme'
            ? uniform.sapato_fechado
            : null,

        horario_entrada:
          type === 'Atraso'
            ? entryTime.trim()
            : null,
      };

      const next = [
        ...pendingRef.current,
        record,
      ];

      await persistPending(uid, next);

      setPage('home');
      setSelectedStudent(null);

      setNotice(
        'OCORRÊNCIA SALVA NO DISPOSITIVO!\n\n' +
        `Aluno: ${selectedStudent.nome}\n` +
        `Tipo: ${type}\n\n` +
        'Aguardando confirmação do Supabase.\n' +
        `${next.length} registro(s) pendente(s).`
      );
    } catch (e) {
      setNotice(
        'Não foi possível salvar: ' +
        errorText(e)
      );
    } finally {
      savingLockRef.current = false;
      setBusy(false);
      syncPending();
    }
  }

  async function loadOccurrences() {
    await run(async () => {
      const { data, error } =
        await supabase
          .from('ocorrencias')
          .select(`
            id,tipo,data,horario,nivel,medida,
            descricao,calca_preta,
            blusa_instituicao,sapato_fechado,
            horario_entrada,
            alunos(nome,matricula,turma,turno)
          `)
          .eq('registrado_por', uid)
          .eq('excluida', false)
          .order('criado_em', {
            ascending: false,
          })
          .limit(200);

      if (error) throw error;

      setOccurrences(data || []);
      setPage('history');
      setConnection('online');
    });
  }

  function openIndividual() {
    setSelectedStudent(null);
    setIndividualRecords(null);
    setSearch('');
    setPage('individual');
    setNotice('');
  }

  async function fetchIndividual(alunoId) {
    const all = [];
    const size = 500;

    for (let start = 0; ; start += size) {
      const { data, error } =
        await supabase
          .from('ocorrencias')
          .select(`
            id,aluno_id,tipo,data,horario,
            nivel,medida,descricao,
            calca_preta,blusa_instituicao,
            sapato_fechado,horario_entrada,
            registrado_por,criado_em
          `)
          .eq('aluno_id', alunoId)
          .eq('excluida', false)
          .order('criado_em', {
            ascending: true,
          })
          .range(
            start,
            start + size - 1
          );

      if (error) throw error;

      all.push(...(data || []));

      if (!data || data.length < size) {
        break;
      }
    }

    return all;
  }

  async function fetchAssistantNames(records) {
    const ids = [
      ...new Set(
        records
          .map(r => r.registrado_por)
          .filter(Boolean)
      ),
    ];

    const names = {};

    for (
      let i = 0;
      i < ids.length;
      i += 100
    ) {
      const { data } =
        await supabase
          .from('assistentes')
          .select('id,nome')
          .in(
            'id',
            ids.slice(i, i + 100)
          );

      (data || []).forEach(a => {
        names[a.id] = a.nome;
      });
    }

    if (assistant?.id) {
      names[assistant.id] =
        assistant.nome;
    }

    return names;
  }

  async function consultIndividual() {
    await run(async () => {
      if (!selectedStudent) {
        throw new Error(
          'Selecione um aluno.'
        );
      }

      const records =
        await fetchIndividual(
          selectedStudent.id
        );

      const names =
        await fetchAssistantNames(records);

      setIndividualRecords(records);
      setAssistantNames(names);

      setNotice(
        `${records.length} ocorrências encontradas.`
      );
    });
  }

  async function sendExistingToDepe(value) {
    await run(async () => {
      if (!selectedStudent) {
        throw new Error(
          'Selecione um aluno.'
        );
      }

      const { data, error } =
        await supabase.functions.invoke(
          'sica-enviar-depe',
          {
            body: {
              aluno_id: selectedStudent.id,
              tipo: value,
            },
          }
        );

      if (error || data?.erro) {
        throw error || new Error(data.erro);
      }

      setNotice(
        data?.enviado
          ? 'Envio aceito. Confira a entrega no Resend.'
          : data?.motivo ||
            'Nenhum novo e-mail enviado.'
      );
    });
  }

  async function generatePDF() {
    if (!selectedStudent) {
      setNotice(
        'Selecione um aluno.'
      );
      return;
    }

    const popup =
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
        ? window.open('', '_blank')
        : null;

    setBusy(true);

    try {
      const records =
        await fetchIndividual(
          selectedStudent.id
        );

      const names =
        await fetchAssistantNames(records);

      const html = buildPDF(
        selectedStudent,
        records,
        names
      );

      if (Platform.OS === 'web') {
        if (!popup) {
          throw new Error(
            'Permita pop-ups no navegador.'
          );
        }

        popup.document.open();
        popup.document.write(html);
        popup.document.close();

        setNotice(
          'Relatório aberto. Use Imprimir ' +
          'e Salvar como PDF.'
        );
      } else {
        const { uri } =
          await Print.printToFileAsync({
            html,
          });

        if (
          await Sharing.isAvailableAsync()
        ) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
          });
        } else {
          setNotice(
            'PDF gerado: ' + uri
          );
        }
      }
    } catch (e) {
      if (popup) popup.close();

      setNotice(
        errorText(e)
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveDepeEmail() {
    await run(async () => {
      const destination =
        depeEmail.trim().toLowerCase();

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          destination
        )
      ) {
        throw new Error(
          'Informe um e-mail válido.'
        );
      }

      const { error } =
        await supabase.rpc(
          'sica_configurar_email_depe',
          {
            p_email: destination,
          }
        );

      if (error) throw error;

      setDepeEmail('');

      setNotice(
        'E-mail do DEPE atualizado!'
      );
    });
  }

  async function generateCode() {
    await run(async () => {
      const { data, error } =
        await supabase.rpc(
          'sica_gerar_codigo_assistente'
        );

      if (error) throw error;

      setGenerated(
        typeof data === 'string'
          ? data
          : JSON.stringify(data)
      );

      setNotice('Código gerado!');
    });
  }

  async function loadCodes() {
    await run(async () => {
      const { data, error } =
        await supabase
          .from('codigos_assistentes')
          .select(
            'codigo,criado_em,usado_em,revogado_em'
          )
          .order('criado_em', {
            ascending: false,
          })
          .limit(100);

      if (error) throw error;

      setCodes(data || []);
    });
  }

  async function revokeCode(value) {
    await run(async () => {
      const { error } =
        await supabase.rpc(
          'sica_revogar_codigo_assistente',
          {
            p_codigo: value,
          }
        );

      if (error) throw error;

      setCodes(prev =>
        prev.map(c =>
          c.codigo === value
            ? {
                ...c,
                revogado_em:
                  new Date().toISOString(),
              }
            : c
        )
      );

      setNotice('Código revogado.');
    });
  }

  function button(
    label,
    action,
    secondary = false,
    disabled = false
  ) {
    return (
      <Pressable
        disabled={busy || disabled}
        onPress={action}
        style={[
          styles.button,
          secondary && styles.secondary,
          (busy || disabled) && {
            opacity: 0.55,
          },
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            secondary && {
              color: DARK,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function field(
    placeholder,
    value,
    setter,
    props = {}
  ) {
    return (
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#777"
        value={value}
        onChangeText={setter}
        autoCapitalize="none"
        {...props}
      />
    );
  }

  function choice(
    label,
    selected,
    action
  ) {
    return (
      <Pressable
        onPress={action}
        style={[
          styles.choice,
          selected &&
            styles.choiceSelected,
        ]}
      >
        <Text
          style={[
            styles.choiceText,
            selected && {
              color: '#fff',
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  const filteredStudents =
    students.filter(s => {
      const q =
        search.trim().toLowerCase();

      return (
        !q ||
        String(s.nome || '')
          .toLowerCase()
          .includes(q) ||
        String(s.matricula || '')
          .toLowerCase()
          .includes(q) ||
        String(s.turma || '')
          .toLowerCase()
          .includes(q)
      );
    });

  function studentSelector() {
    return (
      <>
        <Text style={styles.label}>
          Pesquisar aluno
        </Text>

        {field(
          'Nome, matrícula ou turma',
          search,
          setSearch
        )}

        <Text style={styles.small}>
          {filteredStudents.length} alunos
        </Text>

        {!students.length && (
          <Text style={styles.warning}>
            Lista de alunos indisponível.
            Conecte-se para atualizar.
          </Text>
        )}

        {filteredStudents.map(s => (
          <Pressable
            key={s.id}
            onPress={() => {
              setSelectedStudent(s);
              setIndividualRecords(null);
            }}
            style={[
              styles.student,
              selectedStudent?.id === s.id &&
                styles.selected,
            ]}
          >
            <Text style={styles.bold}>
              {s.nome}
            </Text>

            <Text style={styles.small}>
              Matrícula: {s.matricula}
            </Text>

            <Text style={styles.small}>
              Turma: {s.turma}
              {' • '}
              {s.turno}
            </Text>

            {selectedStudent?.id === s.id && (
              <Text style={styles.green}>
                ✓ Selecionado
              </Text>
            )}
          </Pressable>
        ))}
      </>
    );
  }

  function backHome() {
    setPage('home');
    setNotice('');
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* LOGO OFICIAL DO SICA */}
        <Image
          source={require('./assets/icon.png')}
          style={styles.appIcon}
        />

        {/* NOME SICA PRESERVADO */}
        <Text style={styles.logo}>
          SICA
        </Text>

        <Text style={styles.subtitle}>
          Sistema Integrado de Controle de Alunos
        </Text>

        {!!notice && (
          <View style={styles.notice}>
            <Text
              selectable
              style={styles.noticeText}
            >
              {notice}
            </Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator
            size="large"
            color={GREEN}
          />
        ) : !session ? (
          <View style={styles.panel}>
            <Text style={styles.heading}>
              {screen === 'signup'
                ? 'Cadastro de assistente'
                : 'Entrar no SICA'}
            </Text>

            {screen === 'signup' &&
              field(
                'Nome completo',
                name,
                setName,
                {
                  autoCapitalize: 'words',
                }
              )}

            {field(
              'E-mail',
              email,
              setEmail,
              {
                keyboardType:
                  'email-address',
              }
            )}

            {field(
              'Senha',
              password,
              setPassword,
              {
                secureTextEntry: true,
              }
            )}

            {screen === 'signup' &&
              field(
                'Código individual',
                code,
                setCode
              )}

            {button(
              screen === 'signup'
                ? 'Criar conta'
                : 'Entrar',
              screen === 'signup'
                ? signup
                : login
            )}

            {button(
              screen === 'signup'
                ? 'Já tenho conta'
                : 'Cadastrar assistente',
              () => {
                setScreen(
                  screen === 'signup'
                    ? 'login'
                    : 'signup'
                );
              },
              true
            )}
          </View>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.small}>
              Conectado: {session.user.email}
            </Text>

            {role === 'responsavel' && (
              <>
                <Text style={styles.heading}>
                  Painel do administrador
                </Text>

                <View style={styles.box}>
                  <Text style={styles.heading}>
                    Configurar e-mail do DEPE
                  </Text>

                  {field(
                    'Novo e-mail do DEPE',
                    depeEmail,
                    setDepeEmail,
                    {
                      keyboardType:
                        'email-address',
                    }
                  )}

                  {button(
                    'Salvar e-mail do DEPE',
                    saveDepeEmail
                  )}
                </View>

                <Text style={styles.heading}>
                  Gestão de assistentes
                </Text>

                {button(
                  'Gerar código individual',
                  generateCode
                )}

                {!!generated && (
                  <Text
                    selectable
                    style={styles.code}
                  >
                    {generated}
                  </Text>
                )}

                {button(
                  'Consultar códigos',
                  loadCodes,
                  true
                )}

                {codes.map(c => (
                  <View
                    key={c.codigo}
                    style={styles.item}
                  >
                    <Text
                      selectable
                      style={styles.code}
                    >
                      {c.codigo}
                    </Text>

                    <Text style={styles.small}>
                      {c.usado_em
                        ? 'Utilizado'
                        : c.revogado_em
                        ? 'Revogado'
                        : 'Disponível'}
                    </Text>

                    {!c.usado_em &&
                      !c.revogado_em &&
                      button(
                        'Revogar',
                        () =>
                          revokeCode(
                            c.codigo
                          ),
                        true
                      )}
                  </View>
                ))}
              </>
            )}

            {role === 'assistente' && (
              <>
                <Text style={styles.heading}>
                  Painel do assistente
                </Text>

                <View style={styles.box}>
                  <Text style={styles.small}>
                    Assistente Nº
                  </Text>

                  <Text style={styles.number}>
                    {assistant?.numero ?? '—'}
                  </Text>

                  <Text style={styles.bold}>
                    {assistant?.nome}
                  </Text>
                </View>

                <View style={styles.syncBox}>
                  <Text style={styles.bold}>
                    {syncing
                      ? 'Sincronizando...'
                      : connection === 'online'
                      ? 'SICA conectado'
                      : connection === 'offline'
                      ? 'Modo offline'
                      : 'Verificando conexão'}
                  </Text>

                  <Text style={styles.small}>
                    {pending.length} ocorrência(s)
                    aguardando sincronização
                  </Text>

                  <Text style={styles.small}>
                    {pendingDepe.length} verificação(ões)
                    de DEPE pendente(s)
                  </Text>

                  {lastSync && (
                    <Text style={styles.small}>
                      Última sincronização:{' '}
                      {new Date(
                        lastSync
                      ).toLocaleString('pt-BR')}
                    </Text>
                  )}

                  {button(
                    syncing
                      ? 'Sincronizando...'
                      : 'Sincronizar agora',
                    syncPending,
                    true,
                    syncing
                  )}
                </View>

                {page === 'home' && (
                  <>
                    {button(
                      'Consultar alunos',
                      loadStudents
                    )}

                    {button(
                      'Ocorrência de uniforme',
                      () =>
                        openOccurrence(
                          'Uniforme'
                        )
                    )}

                    {button(
                      'Ocorrência de atraso',
                      () =>
                        openOccurrence(
                          'Atraso'
                        )
                    )}

                    {button(
                      'Conduta inadequada',
                      () =>
                        openOccurrence(
                          'Conduta inadequada'
                        )
                    )}

                    {button(
                      'Histórico de ocorrências',
                      loadOccurrences,
                      true
                    )}

                    {button(
                      'Histórico individual / DEPE / PDF',
                      openIndividual
                    )}
                  </>
                )}

                {page === 'students' && (
                  <>
                    <Text style={styles.heading}>
                      Consulta de alunos
                    </Text>

                    {studentSelector()}

                    {button(
                      'Atualizar lista de alunos',
                      refreshStudents,
                      true
                    )}

                    {button(
                      'Voltar',
                      backHome,
                      true
                    )}
                  </>
                )}

                {page === 'form' && (
                  <>
                    <Text style={styles.heading}>
                      Registrar: {type}
                    </Text>

                    <Text style={styles.small}>
                      O formulário pode ser preenchido
                      sem internet quando a lista
                      de alunos já está salva.
                    </Text>

                    {studentSelector()}

                    {type === 'Uniforme' &&
                      [
                        [
                          'calca_preta',
                          'Calça preta',
                        ],
                        [
                          'blusa_instituicao',
                          'Blusa institucional',
                        ],
                        [
                          'sapato_fechado',
                          'Sapato fechado',
                        ],
                      ].map(([key, label]) => (
                        <View
                          key={key}
                          style={styles.item}
                        >
                          <Text style={styles.label}>
                            {label}
                          </Text>

                          <View style={styles.row}>
                            {choice(
                              'Sim',
                              uniform[key] === true,
                              () =>
                                setUniform(prev => ({
                                  ...prev,
                                  [key]: true,
                                }))
                            )}

                            {choice(
                              'Não',
                              uniform[key] === false,
                              () =>
                                setUniform(prev => ({
                                  ...prev,
                                  [key]: false,
                                }))
                            )}
                          </View>
                        </View>
                      ))}

                    {type === 'Atraso' && (
                      <>
                        <Text style={styles.label}>
                          Horário de entrada
                        </Text>

                        {field(
                          'HH:MM',
                          entryTime,
                          setEntryTime
                        )}
                      </>
                    )}

                    <Text style={styles.label}>
                      Descrição
                    </Text>

                    <TextInput
                      style={[
                        styles.input,
                        {
                          minHeight: 100,
                        },
                      ]}
                      multiline
                      textAlignVertical="top"
                      value={description}
                      onChangeText={
                        setDescription
                      }
                      placeholder="Descreva o ocorrido"
                    />

                    <Text style={styles.label}>
                      Nível
                    </Text>

                    <View style={styles.row}>
                      {LEVELS.map(x =>
                        choice(
                          x,
                          level === x,
                          () => setLevel(x)
                        )
                      )}
                    </View>

                    <Text style={styles.label}>
                      Medida
                    </Text>

                    <View style={styles.row}>
                      {MEASURES.map(x =>
                        choice(
                          x,
                          measure === x,
                          () => setMeasure(x)
                        )
                      )}
                    </View>

                    {button(
                      'Salvar ocorrência',
                      saveOccurrence
                    )}

                    {button(
                      'Cancelar',
                      backHome,
                      true
                    )}
                  </>
                )}

                {page === 'history' && (
                  <>
                    <Text style={styles.heading}>
                      Histórico de ocorrências
                    </Text>

                    {occurrences.map(r => (
                      <View
                        key={r.id}
                        style={styles.item}
                      >
                        <Text style={styles.bold}>
                          {r.alunos?.nome ||
                            'Aluno'}
                        </Text>

                        <Text style={styles.green}>
                          {r.tipo}
                        </Text>

                        <Text style={styles.small}>
                          {dateBR(r.data)}
                          {' às '}
                          {timeBR(r.horario)}
                        </Text>

                        <Text style={styles.small}>
                          Nível: {r.nivel}
                        </Text>

                        <Text style={styles.small}>
                          Medida: {r.medida}
                        </Text>

                        {!!r.descricao && (
                          <Text>
                            {r.descricao}
                          </Text>
                        )}
                      </View>
                    ))}

                    {button(
                      'Voltar',
                      backHome,
                      true
                    )}
                  </>
                )}

                {page === 'individual' && (
                  <>
                    <Text style={styles.heading}>
                      Histórico individual
                    </Text>

                    {studentSelector()}

                    {!!selectedStudent && (
                      <>
                        {button(
                          'Consultar histórico',
                          consultIndividual
                        )}

                        {individualRecords !== null && (
                          <View style={styles.box}>
                            <Text style={styles.heading}>
                              Resumo
                            </Text>

                            <Text style={styles.number}>
                              {individualRecords.length}
                            </Text>

                            <Text style={styles.small}>
                              Total de ocorrências
                            </Text>

                            {TYPES.map(t => {
                              const n =
                                countType(
                                  individualRecords,
                                  t
                                );

                              return (
                                <View
                                  key={t}
                                  style={styles.item}
                                >
                                  <Text style={styles.bold}>
                                    {t}: {n}
                                  </Text>

                                  {n >= 3 && (
                                    <>
                                      <Text
                                        style={styles.warning}
                                      >
                                        Critério do DEPE atingido
                                      </Text>

                                      {button(
                                        `Enviar ${t} ao DEPE`,
                                        () =>
                                          sendExistingToDepe(t)
                                      )}
                                    </>
                                  )}
                                </View>
                              );
                            })}

                            {individualRecords.map(r => (
                              <View
                                key={r.id}
                                style={styles.item}
                              >
                                <Text style={styles.bold}>
                                  {r.tipo}
                                </Text>

                                <Text style={styles.small}>
                                  {dateBR(r.data)}
                                  {' às '}
                                  {timeBR(r.horario)}
                                </Text>

                                <Text style={styles.small}>
                                  Nível: {r.nivel}
                                </Text>

                                <Text style={styles.small}>
                                  Medida: {r.medida}
                                </Text>

                                <Text style={styles.small}>
                                  Assistente:{' '}
                                  {assistantNames[
                                    r.registrado_por
                                  ] ||
                                    'Não disponível'}
                                </Text>

                                {!!r.descricao && (
                                  <Text>
                                    {r.descricao}
                                  </Text>
                                )}
                              </View>
                            ))}
                          </View>
                        )}

                        {button(
                          'Gerar histórico em PDF',
                          generatePDF
                        )}
                      </>
                    )}

                    {button(
                      'Voltar',
                      backHome,
                      true
                    )}
                  </>
                )}
              </>
            )}

            {role === 'pendente' && (
              <>
                <Text style={styles.heading}>
                  Ativação pendente
                </Text>

                {field(
                  'Nome completo',
                  name,
                  setName
                )}

                {field(
                  'Código individual',
                  code,
                  setCode
                )}

                {button(
                  'Ativar acesso',
                  activate
                )}
              </>
            )}

            {role === null && (
              <Text style={styles.warning}>
                Não foi possível confirmar
                sua autorização de acesso.
              </Text>
            )}

            {button(
              'Sair do SICA',
              logout,
              true
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f4f7f3',
  },

  container: {
    alignItems: 'center',
    padding: 18,
    paddingBottom: 50,
    gap: 12,
  },

  // NOVO ESTILO DA LOGO
  appIcon: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: 12,
    borderRadius: 18,
  },

  // NOME SICA MANTIDO
  logo: {
    fontSize: 39,
    fontWeight: '900',
    color: GREEN,
    marginTop: 2,
  },

  subtitle: {
    fontSize: 14,
    color: DARK,
    textAlign: 'center',
    marginBottom: 12,
  },

  panel: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    gap: 13,
    borderWidth: 1,
    borderColor: '#e1e8df',
  },

  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DARK,
    marginTop: 8,
  },

  label: {
    fontSize: 15,
    fontWeight: 'bold',
    color: DARK,
    marginTop: 7,
  },

  input: {
    borderWidth: 1,
    borderColor: '#b9c9b6',
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#222',
    width: '100%',
  },

  button: {
    backgroundColor: GREEN,
    borderRadius: 9,
    paddingVertical: 13,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  secondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: DARK,
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },

  notice: {
    backgroundColor: '#edf8ea',
    borderWidth: 1,
    borderColor: '#b8d9b0',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    maxWidth: 560,
  },

  noticeText: {
    color: DARK,
    textAlign: 'center',
    lineHeight: 21,
  },

  small: {
    fontSize: 13,
    color: '#555',
  },

  bold: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
  },

  green: {
    color: GREEN,
    fontWeight: 'bold',
  },

  warning: {
    color: '#dc2626',
    fontWeight: 'bold',
    fontSize: 13,
  },

  code: {
    fontSize: 14,
    fontWeight: 'bold',
    color: DARK,
  },

  number: {
    fontSize: 28,
    fontWeight: 'bold',
    color: GREEN,
  },

  box: {
    backgroundColor: '#f1f8ef',
    borderRadius: 10,
    padding: 14,
    gap: 9,
  },

  syncBox: {
    backgroundColor: '#e9f4ff',
    borderColor: '#a6c8ec',
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
    gap: 8,
  },

  item: {
    borderTopWidth: 1,
    borderColor: '#ddd',
    paddingTop: 12,
    gap: 7,
  },

  student: {
    borderWidth: 1,
    borderColor: '#d8e1d5',
    borderRadius: 9,
    padding: 12,
    gap: 5,
    backgroundColor: '#fff',
  },

  selected: {
    borderColor: GREEN,
    backgroundColor: '#edf8ea',
  },

  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  choice: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#c8d5c6',
    borderRadius: 8,
    backgroundColor: '#fff',
  },


  choiceSelected: {
    backgroundColor: DARK,
    borderColor: DARK,
  },

  choiceText: {
    color: DARK,
    fontWeight: '600',
  },
  
});

