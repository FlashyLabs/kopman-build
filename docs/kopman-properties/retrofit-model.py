# Kopman Properties retrofit model — mid-case rates from cost research (Q3 2026 CAD)
def retrofit(gfa, docks_new, openings_new, openings_reuse, office_sf, wc, demise_units,
             court_concrete_sf, court_asphalt_sf, roof=True, service_upgrade=110_000, label=""):
    L={}
    L['Dock positions (shared well)'] = docks_new*130_000
    L['New wall openings + lintel']   = openings_new*25_500
    L['Re-use existing openings']     = openings_reuse*9_000
    L['Dock equipment packages']      = docks_new*26_000
    L['Dock doors 9x10 insulated']    = docks_new*6_500
    L['Concrete truck apron']         = court_concrete_sf*22
    L['Heavy-duty asphalt court']     = court_asphalt_sf*10
    L['Excavation / granular']        = (court_concrete_sf+court_asphalt_sf)*5.5
    L['Storm, catch basins, OGS']     = 55_000 + 4*6_500
    L['Curb, striping, bollards']     = 60_000
    L['ESFR sprinkler']               = gfa*10
    L['LED high-bay (net IESO ~30%)'] = gfa*1.25*0.70
    L['Electrical service + submeter'] = service_upgrade + demise_units*6_000
    if roof: L['Roof replacement']    = gfa*22
    L['Slab spot repair (20% area)']  = gfa*0.20*16
    L['Unit heaters']                 = gfa*2.25
    L['Office fit-out']               = office_sf*165
    L['Washrooms']                    = wc*45_000
    L['Interior demo / clean-out']    = gfa*14
    L['Demising walls + services']    = demise_units*35_000
    hard = sum(L.values())
    cont = hard*0.15
    hc   = hard+cont
    ae   = hc*0.085; pm = hc*0.045
    consult = 103_000; env = 95_500; permits = 148_000
    total = hc+ae+pm+consult+env+permits
    return L, hard, cont, ae, pm, consult, env, permits, total

def show(name, gfa, **kw):
    L,hard,cont,ae,pm,cons,env,per,total = retrofit(gfa, **kw)
    print(f"\n{'='*66}\n{name}  —  {gfa:,} sf")
    for k,v in L.items(): print(f"  {k:<34} {v:>12,.0f}")
    print(f"  {'HARD SUBTOTAL':<34} {hard:>12,.0f}")
    print(f"  {'Contingency 15%':<34} {cont:>12,.0f}")
    print(f"  {'A/E 8.5%':<34} {ae:>12,.0f}")
    print(f"  {'PM 4.5%':<34} {pm:>12,.0f}")
    print(f"  {'Consultants':<34} {cons:>12,.0f}")
    print(f"  {'Environmental':<34} {env:>12,.0f}")
    print(f"  {'Permits/SPA/legal':<34} {per:>12,.0f}")
    print(f"  {'TOTAL RETROFIT':<34} {total:>12,.0f}   ${total/gfa:,.2f}/sf")
    return total

# CS1 Scarborough 30 Dovedale — 34,974 sf, assume grade-dominant, build 6 docks
t1=show("CS-01  30 DOVEDALE CT, SCARBOROUGH", 34974, docks_new=6, openings_new=4, openings_reuse=2,
     office_sf=4000, wc=4, demise_units=6, court_concrete_sf=7200, court_asphalt_sf=20000)
# CS2 Brampton 1075 Clark — 35,842 sf, has 4TL already, add 2 + heavy de-fit (cranes, wash bay)
t2=show("CS-02  1075 CLARK BLVD, BRAMPTON", 35842, docks_new=2, openings_new=2, openings_reuse=0,
     office_sf=3500, wc=4, demise_units=5, court_concrete_sf=4200, court_asphalt_sf=16000)
# CS3 Burlington 1140 Blair — 35,593 sf, 3TL already, add 3, 22' clear, lighter scope, roof unknown
t3=show("CS-03  1140 BLAIR RD, BURLINGTON", 35593, docks_new=3, openings_new=3, openings_reuse=0,
     office_sf=3000, wc=3, demise_units=5, court_concrete_sf=5400, court_asphalt_sf=18000)
