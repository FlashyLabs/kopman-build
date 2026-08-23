# Underwriting: targeted (leasability-unlock) scope vs full reposition, and max supportable bid.
def targeted(gfa, docks, openings, demise, court_c, court_a, roof=False, esfr=False,
             office_sf=0, service=110_000):
    L={}
    L['Docks (ganged well)']=docks*130_000
    L['Wall openings']=openings*25_500
    L['Dock equipment']=docks*26_000
    L['Dock doors']=docks*6_500
    L['Concrete apron']=court_c*22
    L['Asphalt court']=court_a*10
    L['Excavation/granular']=(court_c+court_a)*5.5
    L['Storm/CB/OGS']=81_000
    L['Curb/stripe/bollards']=60_000
    L['LED (net rebate)']=gfa*1.25*0.7
    L['Electrical + submetering']=service+demise*6_000
    L['Slab spot repair']=gfa*0.15*16
    L['Unit heaters']=gfa*2.25
    L['Demo / clean-out (targeted)']=gfa*7
    L['Demising walls + services']=demise*35_000
    L['Washrooms (1 per bay)']=demise*45_000
    if roof: L['Roof replacement']=gfa*22
    if esfr: L['ESFR sprinkler']=gfa*10
    if office_sf: L['Office fit-out']=office_sf*165
    hard=sum(L.values()); cont=hard*0.15; hc=hard+cont
    soft=hc*0.13 + 103_000+95_500+148_000
    return L, hard, hc+soft

def value(gfa, rent, cap, vac=0.05, mgmt=0.03, tmi_leak=0.0):
    gross=gfa*rent
    noi=gross*(1-vac)*(1-mgmt)
    return noi, noi/cap

def maxbid(gfa, retrofit, rent, cap, profit=0.20):
    noi,val = value(gfa,rent,cap)
    return noi, val, val/(1+profit)-retrofit

for nm,gfa,docks,openings,demise,cc,ca,rent,cap,ask in [
  ("30 DOVEDALE CT, SCARBOROUGH", 34974, 6, 4, 6, 7200, 20000, 16.00, 0.0575, 12_950_000),
  ("1075 CLARK BLVD, BRAMPTON",   35842, 2, 2, 5, 4200, 16000, 17.25, 0.0575, 35842*519),
  ("1140 BLAIR RD, BURLINGTON",   35593, 3, 3, 5, 5400, 18000, 16.25, 0.0575, 12_500_000),
]:
    L,hard,tot = targeted(gfa,docks,openings,demise,cc,ca)
    noi,val,mb = maxbid(gfa,tot,rent,cap)
    print(f"\n{'='*70}\n{nm}   {gfa:,} sf")
    for k,v in L.items(): print(f"   {k:<30}{v:>11,.0f}")
    print(f"   {'TARGETED HARD':<30}{hard:>11,.0f}")
    print(f"   {'TARGETED ALL-IN RETROFIT':<30}{tot:>11,.0f}   ${tot/gfa:,.2f}/sf")
    print(f"   asking                        {ask:>11,.0f}   ${ask/gfa:,.0f}/sf")
    print(f"   all-in at asking              {ask+tot:>11,.0f}   ${(ask+tot)/gfa:,.0f}/sf")
    print(f"   stabilised NOI @ ${rent}/sf    {noi:>11,.0f}")
    print(f"   stabilised value @ {cap:.2%}     {val:>11,.0f}   ${val/gfa:,.0f}/sf")
    print(f"   surplus/(deficit) vs all-in   {val-(ask+tot):>11,.0f}")
    print(f"   MAX BID for 20% profit        {mb:>11,.0f}   ${mb/gfa:,.0f}/sf")
    print(f"   discount required vs ask      {(1-mb/ask)*100:>10.1f}%")

print("\n\n"+"#"*74)
print("# DUAL-EXIT TEST: hold-for-income vs subdivide-and-sell to owner-occupiers")
print("#"*74)
deals=[("30 Dovedale Ct, Scarborough",34974,12_950_000,3_972_169,16.00),
       ("1075 Clark Blvd, Brampton",  35842,35842*519, 2_775_813,17.25),
       ("1140 Blair Rd, Burlington",  35593,12_500_000,3_099_234,16.25)]
for nm,gfa,ask,ret,rent in deals:
    allin=ask+ret; psf=allin/gfa
    print(f"\n{nm}  —  {gfa:,} sf")
    print(f"  Acquire {ask:>12,.0f} (${ask/gfa:.0f}/sf) + Retrofit {ret:>10,.0f} (${ret/gfa:.0f}/sf) = ALL-IN {allin:>12,.0f} (${psf:.0f}/sf)")
    noi=gfa*rent*0.95*0.97
    print(f"  HOLD  : NOI {noi:>9,.0f} @5.75% = {noi/0.0575:>12,.0f} (${noi/0.0575/gfa:.0f}/sf)  ->  {noi/0.0575-allin:>+12,.0f}   [{'PASS' if noi/0.0575>allin else 'FAIL'}]")
    for ex in (550,600,650,700):
        gross=gfa*ex; net=gross*0.96; p=net-allin
        print(f"  SELL @${ex}/sf: gross {gross:>12,.0f}  net of 4% {net:>12,.0f}  profit {p:>+11,.0f}  = {p/allin*100:>6.1f}% on cost")
