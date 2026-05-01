import { PrismaClient } from '@prisma/client';

const supabaseUrl = 'postgresql://postgres.vqdmwevdlmqdtfbfceoc:Tapohameno_717@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const prismaLocal = new PrismaClient();

async function migrate() {
  console.log('🔄 Iniciando migração...\n');

  try {
    // Conectar ao Supabase
    console.log('📡 Conectando ao Supabase...');
    const supabase = new PrismaClient({
      datasources: {
        db: {
          url: supabaseUrl
        }
      }
    });

    // Buscar vendedores do Supabase
    console.log('👥 Buscando vendedores...');
    const vendedores = await supabase.$queryRaw<any[]>`
      SELECT id, nome FROM public.vendedores
    `;
    console.log(`   Encontrados ${vendedores.length} vendedores\n`);

    // Buscar rotas do Supabase
    console.log('🛣️  Buscando rotas...');
    const rotas = await supabase.$queryRaw<any[]>`
      SELECT 
        r.id, 
        r.nome, 
        r.data_criacao,
        r.data_termino,
        r.vendedor_id,
        v.nome as vendedor_nome
      FROM public.rotas r
      JOIN public.vendedores v ON r.vendedor_id = v.id
    `;
    console.log(`   Encontradas ${rotas.length} rotas\n`);

    await supabase.$disconnect();

    if (rotas.length === 0) {
      console.log('⚠️  Nenhuma rota para migrar. Encerrando.');
      return;
    }

    // Mostrar rotas que serão migradas
    console.log('📋 Rotas a serem migradas:');
    rotas.forEach(r => {
      console.log(`   - ${r.nome} (Vendedor: ${r.vendedor_nome})`);
    });
    console.log('');

    // Migrar vendedores primeiro
    console.log('👥 Migrando vendedores...');
    const vendorIdMap = new Map<string, string>();
    
    for (const vendedor of vendedores) {
      // Verificar se já existe por nome
      const existing = await prismaLocal.user.findFirst({
        where: { name: vendedor.nome }
      });

      if (existing) {
        vendorIdMap.set(vendedor.id, existing.id);
        console.log(`   - Vendedor já existe: ${vendedor.nome} (usará ID local: ${existing.id})`);
      } else {
        const newUser = await prismaLocal.user.create({
          data: {
            id: vendedor.id,
            name: vendedor.nome,
            email: `${vendedor.nome.toLowerCase().replace(/\s/g, '.')}@migrated.com`,
            password: 'migrated_hash',
            role: 'seller',
            verified: true,
          }
        });
        vendorIdMap.set(vendedor.id, newUser.id);
        console.log(`   ✓ Vendedor criado: ${vendedor.nome}`);
      }
    }

    // Migrar rotas
    console.log('\n🛣️  Migrando rotas...');
    for (const rota of rotas) {
      // Extrair mês e ano do nome da rota
      const monthYearMatch = rota.nome.match(/(\d{1,2})\/(\d{4})|(\d{4})/);
      let month = new Date().getMonth() + 1;
      let year = new Date().getFullYear();

      if (monthYearMatch) {
        if (monthYearMatch[1] && monthYearMatch[2]) {
          month = parseInt(monthYearMatch[1]);
          year = parseInt(monthYearMatch[2]);
        } else if (monthYearMatch[3]) {
          year = parseInt(monthYearMatch[3]);
        }
      }

      // Verificar se já existe
      const existing = await prismaLocal.route.findFirst({
        where: { name: rota.nome }
      });

      if (!existing) {
        // Usar o ID mapeado do vendedor
        const userId = vendorIdMap.get(rota.vendedor_id);
        
        await prismaLocal.route.create({
          data: {
            id: rota.id,
            name: rota.nome,
            userId: userId,
            month: month,
            year: year,
            createdAt: rota.data_criacao ? new Date(rota.data_criacao) : new Date(),
          }
        });
        console.log(`   ✓ Rota: ${rota.nome}`);
      } else {
        console.log(`   - Rota já existe: ${rota.nome}`);
      }
    }

    console.log('\n✅ Migração concluída com sucesso!');

    // Mostrar resumo
    const totalRotas = await prismaLocal.route.count();
    const totalVendedores = await prismaLocal.user.count();
    console.log(`\n📊 Resumo:`);
    console.log(`   Total de rotas no banco local: ${totalRotas}`);
    console.log(`   Total de vendedores no banco local: ${totalVendedores}`);

  } catch (error) {
    console.error('\n❌ Erro na migração:', error);
  } finally {
    await prismaLocal.$disconnect();
  }
}

migrate();
