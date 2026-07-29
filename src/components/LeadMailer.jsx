import React, { useState, useEffect } from 'react';
import { X, Send, RefreshCw, RotateCcw, CheckCircle2, MessageCircle, Info } from 'lucide-react';

const LEADS_DATA = [
  { n: "Pablo", l: "Erdini", c: "Real Aires", p: "5491134793662" },
  { n: "Marce", l: "", c: "Marin Propiedades", p: "5491162714815" },
  { n: "Grace", l: "", c: "Century 21 Dadam", p: "5491133255855" },
  { n: "Anny", l: "Cresp", c: "Remax Urbana III", p: "5491158010448" },
  { n: "Abi", l: "", c: "Remax Platino", p: "5491127715534" },
  { n: "Adrus", l: "XO", c: "Partner", p: "5491155880666" },
  { n: "Agus", l: "", c: "Botts", p: "5491138163802" },
  { n: "Agustin", l: "", c: "Bocanera C21", p: "5491131179115" },
  { n: "Agustin", l: "", c: "Centurion Real Aires", p: "5491131877605" },
  { n: "Agustin", l: "", c: "Galceran Inmo", p: "5491153087733" },
  { n: "Agustina", l: "González", c: "Remax Urbana III", p: "5491157292283" },
  { n: "Alan", l: "Geier", c: "", p: "5491141771234" },
  { n: "Alberto", l: "Hammoud", c: "Remax Class", p: "5491165891221" },
  { n: "Ale", l: "", c: "Remax Centenario", p: "5491151457307" },
  { n: "Ale", l: "", c: "Cliente Foto", p: "5491151038338" },
  { n: "Alejandra", l: "Campero", c: "Remax", p: "5491127293853" },
  { n: "Alejandra", l: "Guastoni", c: "", p: "5491157077636" },
  { n: "Alejandra", l: "Schiavoni", c: "Remax Urbana", p: "5491154616908" },
  { n: "Alejandro", l: "Amoroso", c: "Remax Premium II", p: "5491136912497" },
  { n: "Ana Gabriela", l: "", c: "Remax", p: "5491127258605" },
  { n: "Ana", l: "Kacha", c: "Reve Real Estate", p: "5491153695108" },
  { n: "Analia", l: "Fernandez", c: "C21 Dadam", p: "5491141589148" },
  { n: "Analia Gimena", l: "Rodríguez Cejas", c: "Remax", p: "5491141812872" },
  { n: "Andrea", l: "G.", c: "Remax", p: "5491152621824" },
  { n: "Andrea", l: "Leon", c: "Remax", p: "5491159715194" },
  { n: "Andrea", l: "Steinsleger", c: "", p: "5491165274930" },
  { n: "Andrea", l: "", c: "Real Aires", p: "5491150533723" },
  { n: "Angeles", l: "Blomberg", c: "", p: "5491150389016" },
  { n: "Angeles", l: "Galván", c: "", p: "5491140253496" },
  { n: "Ani", l: "Chibán", c: "", p: "5491158755612" },
  { n: "Sabrina", l: "Marinoni", c: "Arq. Remax", p: "5491153849216" },
  { n: "Axel", l: "Azcarate", c: "Remax", p: "5491128700176" },
  { n: "Bet", l: "Marinoni", c: "", p: "5491130107855" },
  { n: "Bloom", l: "", c: "", p: "5491150583362" },
  { n: "Alejandro", l: "", c: "C21", p: "5491159541838" },
  { n: "Alma", l: "", c: "C21", p: "5492375010506" },
  { n: "Augusto", l: "", c: "C21", p: "5491136409146" },
  { n: "Sabrina", l: "Szlit", c: "C21 Brag", p: "5491153895618" },
  { n: "Carlos", l: "Conti", c: "C21", p: "5491161791987" },
  { n: "Cecilia", l: "Gonzalez", c: "C21", p: "5491165536384" },
  { n: "Andrea", l: "Andrade", c: "C21 Cosentino", p: "5491126731568" },
  { n: "Uriel", l: "", c: "C21 Cosentino", p: "5491151539194" },
  { n: "Cristina", l: "", c: "C21", p: "5491141741177" },
  { n: "Claudio", l: "Gimbatti", c: "C21", p: "5491123492836" },
  { n: "Evelyn", l: "", c: "C21 Dadam", p: "5491130727742" },
  { n: "Germán", l: "", c: "C21 Dadam", p: "5491161771740" },
  { n: "Laura", l: "Mallimaci", c: "C21 Dadam", p: "5491156265057" },
  { n: "Martin", l: "Saporiti", c: "C21 Dadam", p: "5491169826547" },
  { n: "Nancy", l: "", c: "C21 Dadam", p: "5491124571011" },
  { n: "Sergio", l: "Lopez", c: "C21 Dadam", p: "5491124635055" },
  { n: "Ximena", l: "", c: "C21 Dadam", p: "5491132774321" },
  { n: "Yanina", l: "Delacour", c: "C21 Dadam", p: "5491140987399" },
  { n: "Daniel", l: "Rosso", c: "C21", p: "5491161238751" },
  { n: "Gustavo", l: "Pigni", c: "C21 Palopoli", p: "5491156943230" },
  { n: "Diego", l: "Mateos", c: "C21", p: "5491150971318" },
  { n: "Edith", l: "", c: "C21", p: "5491161616952" },
  { n: "Edu", l: "Cafferata", c: "C21", p: "5491140294905" },
  { n: "Karina", l: "Faerman", c: "C21", p: "5491130004737" },
  { n: "Victoria", l: "Carbia", c: "C21", p: "5491162434817" },
  { n: "Gabriela", l: "", c: "C21", p: "5491155269136" },
  { n: "Esperanza", l: "Abondano", c: "C21", p: "5491164796132" },
  { n: "Evelyn", l: "Quintar", c: "C21", p: "5491153008118" },
  { n: "Germán", l: "Bosano", c: "C21", p: "5491150599250" },
  { n: "María Alejandra", l: "Galindo", c: "C21", p: "5491123878842" },
  { n: "Natalia", l: "Berales", c: "C21", p: "5491137736612" },
  { n: "Paola", l: "Del Sordo", c: "C21", p: "5491159386821" },
  { n: "María", l: "Pereira", c: "C21", p: "5491155671022" },
  { n: "Ruth", l: "Pollevik", c: "C21", p: "5491141731146" },
  { n: "Viryna", l: "Hernández", c: "C21", p: "5491168007730" },
  { n: "Alejandro", l: "Nuñez", c: "C21 Hirigoyen", p: "5491164539029" },
  { n: "Carina", l: "", c: "C21 Hirigoyen", p: "5491123432367" },
  { n: "Franco", l: "Castro", c: "C21 Hirigoyen", p: "5491158264661" },
  { n: "Karina", l: "Ale", c: "C21", p: "5491161941818" },
  { n: "Laura", l: "Faerman", c: "C21", p: "5491153399408" },
  { n: "Leandro", l: "Caamaño", c: "C21", p: "5491154253728" },
  { n: "Leandro", l: "", c: "C21", p: "5491168341234" },
  { n: "María", l: "", c: "C21", p: "5491125058197" },
  { n: "Martin", l: "Errea", c: "C21", p: "5491151041041" },
  { n: "Mirta", l: "", c: "C21", p: "5491150287733" },
  { n: "Pablo", l: "Oks", c: "C21 Villa Crespo", p: "5491171708000" },
  { n: "Estefanía", l: "", c: "C21", p: "5491168540021" },
  { n: "Paula", l: "Mendiguren", c: "C21", p: "5491133727101" },
  { n: "Estefanía", l: "", c: "C21 Puebla", p: "5491141788251" },
  { n: "María", l: "", c: "C21 Puebla", p: "5491159794403" },
  { n: "Sebastián", l: "", c: "C21 Puebla", p: "5491144303509" },
  { n: "Silvana", l: "", c: "C21 Vecchio", p: "5491159586396" },
  { n: "Calviño", l: "Tabuada", c: "", p: "5491154794749" },
  { n: "Camila", l: "Jara", c: "Remax", p: "5491121589571" },
  { n: "Camila", l: "", c: "Remax Cosmo", p: "5491122833368" },
  { n: "Cande", l: "Ferrofino", c: "Remax Platino", p: "5491162054977" },
  { n: "Carolina", l: "Voci", c: "Remax", p: "5491169106115" },
  { n: "Cata", l: "Cabrini", c: "Remax Platino", p: "5491161974521" },
  { n: "Celes", l: "", c: "Remax", p: "5491166249362" },
  { n: "Celia", l: "Tarzibachi", c: "Remax Flow", p: "5491141429536" },
  { n: "Christian", l: "Gonzalez", c: "Remax Urbana", p: "5491130434062" },
  { n: "Cintia", l: "", c: "Yankel", p: "5491153754350" },
  { n: "Clau", l: "", c: "Alas Bienes Raices", p: "5491139332352" },
  { n: "Clau", l: "", c: "Keller Williams", p: "5491169702626" },
  { n: "Claudia", l: "Collini", c: "Remax Parque", p: "5491169374907" },
  { n: "Claudia Ines", l: "Pizzarello", c: "Remax P2", p: "5491165420390" },
  { n: "Claudia", l: "", c: "Remax", p: "5491132978787" },
  { n: "Constanza", l: "", c: "Remax Platino", p: "5491137650181" },
  { n: "Cristina", l: "Garcia", c: "Remax Urbana 3", p: "5491144446955" },
  { n: "Cynthia", l: "Cohen", c: "Pasantes Propiedades", p: "5491133301002" },
  { n: "Daiana", l: "Sánchez Gabotti", c: "Bienes Raíces", p: "5491163066765" },
  { n: "Daniel", l: "Chiappetta", c: "Remax", p: "5491155050711" },
  { n: "Daniela", l: "", c: "Remax", p: "5491138622591" },
  { n: "Daniela", l: "Sesto", c: "Botts Real Estate", p: "5491140815678" },
  { n: "Dario", l: "Bublitz", c: "Remax", p: "5491140634799" },
  { n: "Dario", l: "", c: "Remax PII", p: "5491164798263" },
  { n: "David", l: "Agote", c: "Inmobiliaria", p: "5491150085086" },
  { n: "David", l: "Pana", c: "", p: "5491171656255" },
  { n: "Deborah", l: "Saul", c: "Yankel", p: "5491145364533" },
  { n: "Diego", l: "Masri", c: "Remax Premium IV", p: "5491141401201" },
  { n: "Diego", l: "", c: "Remax Urbana", p: "5491154838344" },
  { n: "edgar", l: "birador", c: "Inmobiliaria", p: "5491134143707" },
  { n: "Edison", l: "", c: "Remax Urbana III", p: "5491121901080" },
  { n: "Eduardo", l: "Ferrucci", c: "Constructora", p: "5491136332455" },
  { n: "Eli", l: "Pereyra", c: "Remax Platino", p: "5491136592188" },
  { n: "Enrique", l: "Lo Cane", c: "Estudio Garcia", p: "5491136699053" },
  { n: "Ernesto", l: "Prezzia", c: "Inmo", p: "5491150038773" },
  { n: "Esteban", l: "Chazarreta", c: "Remax Premium lll", p: "5491160150715" },
  { n: "Gustavo", l: "", c: "Estudio Garcia Inmobiliarios", p: "5491128842885" },
  { n: "Euge", l: "", c: "Remax", p: "5491132168866" },
  { n: "Fabian", l: "Andoniadis", c: "Botts", p: "5491135061964" },
  { n: "Fabiana", l: "", c: "Remax", p: "5491169301624" },
  { n: "Facundo", l: "", c: "Remax", p: "5491173657633" },
  { n: "Fede", l: "", c: "C21", p: "5491140465264" },
  { n: "Fede", l: "", c: "Remax Premium", p: "5491144092344" },
  { n: "Federico", l: "Lopez Diedrichs", c: "", p: "5491171109995" },
  { n: "Flor", l: "Latorre", c: "Remax Gold", p: "5491140790303" },
  { n: "Flor", l: "", c: "Remax Desafio", p: "5491133339478" },
  { n: "Florenxia", l: "GP", c: "Remax", p: "5491172275698" },
  { n: "fran", l: "", c: "Remax Centenariio", p: "5491122549276" },
  { n: "Gabriel", l: "Martinez", c: "C21 Dadam", p: "5491163006626" },
  { n: "Gabriel", l: "Ozán", c: "C21", p: "5491135786151" },
  { n: "Gabriela", l: "", c: "Remax Cosmo", p: "5491140873223" },
  { n: "Gabriela", l: "", c: "Remax Urbana", p: "5491161922448" },
  { n: "Gallelli", l: "", c: "Gallelli y Asociados", p: "5491168743329" },
  { n: "Gaston", l: "Marquez", c: "Remax Premium II", p: "5491151141345" },
  { n: "Gaston", l: "Vaquer", c: "Remax Urbana III", p: "5491131403883" },
  { n: "German", l: "", c: "Hostel", p: "5491150026802" },
  { n: "German", l: "Vione", c: "Inmobiliario", p: "5491168581635" },
  { n: "Gilda", l: "Parrotta", c: "Remax Premium", p: "5491154683157" },
  { n: "Gimena", l: "Mastroianni", c: "Remax", p: "5491159203868" },
  { n: "Gisela", l: "De Prado", c: "Remax", p: "5491157537470" },
  { n: "Giselle", l: "RM", c: "Remax", p: "5491164726400" },
  { n: "Gitana Malen", l: "Daix", c: "Inmo", p: "5491151058321" },
  { n: "Gonzalo", l: "muñiz", c: "Remax", p: "5491168037413" },
  { n: "Gonzalo", l: "", c: "Coldwell Banker", p: "5491166313920" },
  { n: "Griselda", l: "Rojas", c: "Urbana iII", p: "5491153830870" },
  { n: "Guido", l: "Bargardi", c: "Remax Premium iII", p: "5491136526072" },
  { n: "Guillermo", l: "Martínez", c: "Remax Platino", p: "5491168183434" },
  { n: "Gustavo", l: "Cohen", c: "", p: "54911444488296" },
  { n: "Hector", l: "", c: "C21", p: "5491151532251" },
  { n: "Hernán", l: "Bárcena", c: "Remax Premium II", p: "5491156915907" },
  { n: "Hernan", l: "Solberg", c: "Botts", p: "5491141809090" },
  { n: "Ingrid", l: "", c: "Grupo Marting", p: "5491127270168" },
  { n: "Ingrid", l: "Martín", c: "Inmobiliaria", p: "5491132680102" },
  { n: "Ivana", l: "", c: "Remax", p: "5491168091605" },
  { n: "Javier", l: "", c: "Remax Uno", p: "5491157528752" },
  { n: "Javier", l: "Tandei", c: "Remax Premium II", p: "5491151828862" },
  { n: "Jeannette", l: "", c: "Remax Platino", p: "5491158016482" },
  { n: "Jimena", l: "Peracca", c: "Remax Urbana III", p: "5491134005416" },
  { n: "Johana", l: "Trosman", c: "", p: "5491161319730" },
  { n: "Johanna", l: "Litvinoff", c: "Yankel", p: "5491162517664" },
  { n: "Jorgelina", l: "Goldwaser", c: "Remax", p: "5491139431131" },
  { n: "José", l: "Carozzo", c: "Remax Advance", p: "5491160560442" },
  { n: "Jose", l: "Guendler", c: "Remax Platino", p: "5491157638485" },
  { n: "Jose", l: "Yunes", c: "Remax Premium", p: "5491163779505" },
  { n: "JUAN MANUEL", l: "SANTILLAN", c: "", p: "5491157022700" },
  { n: "Juanchi", l: "", c: "Botts", p: "5491131630863" },
  { n: "Juli", l: "", c: "Remax", p: "5491164844684" },
  { n: "Julieta", l: "Vidal", c: "Team Lugo Inmo", p: "5491139225907" },
  { n: "juliojaimesfreyre", l: "", c: "Remax Platino", p: "5491165544507" },
  { n: "Karen", l: "", c: "Grupo Marting", p: "5491167121674" },
  { n: "Karen", l: "Reindl", c: "Inmobiliaria", p: "5491140898722" },
  { n: "Lala", l: "Suárez", c: "C21", p: "5491130819522" },
  { n: "Leonardo", l: "Erlich", c: "Real Estate", p: "5491168403636" },
  { n: "Leonidas", l: "Vasquez", c: "Real Aires", p: "5491123731145" },
  { n: "Leticia", l: "Alvarez", c: "Remax Puerto", p: "5491168932547" },
  { n: "Juan Manuel", l: "Leoni", c: "Lic.", p: "5491163636660" },
  { n: "Lilian", l: "", c: "Remax", p: "5491152618042" },
  { n: "Liliana", l: "Martin", c: "", p: "5491162519558" },
  { n: "Liliana", l: "Pérez", c: "Remax Raices", p: "5491141851866" },
  { n: "Liz", l: "Pagano", c: "Yankel", p: "5491161241026" },
  { n: "Lizzie", l: "Newman", c: "", p: "5491168266092" },
  { n: "Lucas", l: "Angelico", c: "Remax Premium II", p: "5491167279428" },
  { n: "Lucas", l: "Di Luzio", c: "Remax", p: "5491136796680" },
  { n: "Lucía", l: "Hernández", c: "Remax Nova", p: "5491131111841" },
  { n: "Lucía", l: "Olmedo", c: "Remax Urbana III", p: "5491138100003" },
  { n: "Luciana", l: "Ibañez", c: "Remax Puertos", p: "5491171751605" },
  { n: "Luis Horacio", l: "", c: "Botts", p: "5491133036325" },
  { n: "Luquita", l: "", c: "", p: "5491132087234" },
  { n: "Eugenia", l: "Argento", c: "Lepore", p: "5491154567976" },
  { n: "Cecilia", l: "Adamson", c: "Oax", p: "5493447463846" },
  { n: "Mabel", l: "", c: "Remax Platino", p: "5491156458469" },
  { n: "Marcela", l: "Fernandez", c: "Remax Platino", p: "5491122625700" },
  { n: "marcela", l: "moix", c: "", p: "5491167142624" },
  { n: "Marcela", l: "Propicia", c: "Real Estate", p: "5491161565627" },
  { n: "Marcelo", l: "Alvarez", c: "Remax", p: "5491127594216" },
  { n: "Marcelo", l: "Caviggia", c: "Botts", p: "5491160017263" },
  { n: "Marcelo", l: "Frangipani", c: "Remax Platino", p: "5491133290077" },
  { n: "Marcos", l: "Di Tata", c: "Dodorico", p: "5491132121758" },
  { n: "María Eugenia", l: "Kaprielian", c: "Remax Urbana", p: "5491164402488" },
  { n: "María José", l: "Rio", c: "C21", p: "5491165590684" },
  { n: "María", l: "Pouysségur", c: "Remax Platino", p: "5491155239538" },
  { n: "María", l: "Riquelme", c: "", p: "5491133679670" },
  { n: "Marian", l: "", c: "Remax", p: "5491156536303" },
  { n: "Mariana", l: "Meyer", c: "Real Aires", p: "5491155679666" },
  { n: "Mariano", l: "Martin Fresno", c: "Remax", p: "5491162502232" },
  { n: "Mariano", l: "Zanelli", c: "Inmobiliaria", p: "5492215672052" },
  { n: "Mariela", l: "Cocuzza", c: "Remax Premium III", p: "5491131493203" },
  { n: "Marina", l: "Di Genaro", c: "", p: "5491134382108" },
  { n: "Marisa", l: "Kühn", c: "Inmobiliaria", p: "5491156661210" },
  { n: "Martin", l: "Quaranta", c: "Remax Premium", p: "5491130971408" },
  { n: "Martina", l: "Gambino Bordenabe", c: "Remax", p: "5491121614054" },
  { n: "Marto", l: "", c: "Marin Inmobiliaria", p: "5491168054884" },
  { n: "Mati", l: "", c: "Inlaza", p: "5491153159634" },
  { n: "Mau", l: "", c: "Remax Platino", p: "5491166228901" },
  { n: "Maxi", l: "Mendez", c: "Real Aires", p: "5491158081700" },
  { n: "Maximiliano", l: "", c: "Desarrolladora Bloom", p: "5491168985497" },
  { n: "Maximiliano", l: "hanono", c: "Remax Urbana", p: "5491144367334" },
  { n: "Máximo", l: "Manikis", c: "MKS Inmobiliaria", p: "5491124722514" },
  { n: "Melisa", l: "Gleizer", c: "Remax", p: "5491160493226" },
  { n: "Moitsa", l: "Flisar", c: "Botts Real Estate", p: "5491144731877" },
  { n: "Monica", l: "Aramis", c: "Yankel", p: "5491131407688" },
  { n: "Maria Laura", l: "Mosca", c: "Propiedades", p: "5491138271060" },
  { n: "nico", l: "", c: "Mks Inmobiliaria", p: "5491137770535" },
  { n: "Nicolás", l: "Martín Díaz", c: "Inmo Martillero", p: "5491159326791" },
  { n: "Nicolás", l: "Medrano", c: "Remax Advance", p: "5491169984711" },
  { n: "Nicolas", l: "Nakassian", c: "Remax Premium", p: "5491163322460" },
  { n: "Nicolas", l: "Zelasqui", c: "Remax Uno", p: "5491166702934" },
  { n: "Noelia", l: "", c: "Yankel Group", p: "5491134045855" },
  { n: "NORA", l: "", c: "Remax Platino", p: "5491165382161" },
  { n: "Omar", l: "", c: "Remax Platino", p: "5491149375539" },
  { n: "Orne", l: "Accardi", c: "Real Estate", p: "5491162155132" },
  { n: "Pao", l: "", c: "Botts", p: "5491121562046" },
  { n: "Paola", l: "", c: "Bienes Raíces", p: "5491134740111" },
  { n: "Patricia", l: "", c: "Remax Platino", p: "5491134807007" },
  { n: "Patricia", l: "", c: "Remax Platino II", p: "5491139556978" },
  { n: "Paula", l: "Dallochio", c: "Estudio Inmobiliario", p: "5491140856083" },
  { n: "Paula", l: "", c: "Remax", p: "5491162793599" },
  { n: "Paz", l: "Aguilar", c: "", p: "5491158099525" },
  { n: "Daniel", l: "Persino", c: "Remax Team", p: "5491169783088" },
  { n: "Marcela", l: "Propicia", c: "", p: "5491124016783" },
  { n: "Adriana", l: "", c: "Remax Plaza", p: "5491128882519" },
  { n: "Jorge", l: "", c: "Remax Central", p: "5491164539863" },
  { n: "Pablo", l: "", c: "Remax City", p: "5491154004265" },
  { n: "Fabian", l: "", c: "Remax", p: "5491137820799" },
  { n: "Elena", l: "Casariego", c: "Remax Magda", p: "5491152628135" },
  { n: "Damián", l: "Frega", c: "Remax Parque", p: "5491144398380" },
  { n: "Pepa", l: "", c: "Remax", p: "5491130134922" },
  { n: "Santiago", l: "", c: "Remax Platino", p: "5491162581122" },
  { n: "Ariel", l: "Tafalla", c: "Remax Plaza", p: "5491132461957" },
  { n: "Claudia", l: "Andía", c: "Remax Plaza", p: "5491122531275" },
  { n: "Jeremías", l: "", c: "Remax Plaza", p: "5491165232300" },
  { n: "Juan", l: "Kowalsky", c: "Remax Plaza", p: "5491151277163" },
  { n: "Romina", l: "Ottolia", c: "Remax Plaza", p: "5491170264178" },
  { n: "Ana", l: "Guzzo", c: "Remax Raíces", p: "5491144208816" },
  { n: "Juan Carlos", l: "Trejo", c: "Remax Raíces", p: "5491151102948" },
  { n: "María", l: "Julia", c: "Remax Raíces", p: "5491165833050" },
  { n: "Cintia", l: "", c: "Remax Urbana", p: "5491138333383" },
  { n: "Oficina", l: "", c: "Remax Urbana", p: "5491149010060" },
  { n: "Romina", l: "", c: "Remax", p: "5491169637487" },
  { n: "Kari", l: "", c: "Remax Plaza", p: "5491168013023" },
  { n: "Ricardo", l: "Pasantes", c: "C21", p: "5491150010783" },
  { n: "Ricardo", l: "Portal", c: "", p: "5491160102505" },
  { n: "Ignacio", l: "Toro", c: "Remax Accion", p: "5491154237655" },
  { n: "Mariano", l: "Gruppuso", c: "Remax Advance", p: "5491163712061" },
  { n: "Aldo", l: "", c: "Remax", p: "5491137638808" },
  { n: "Kevin", l: "", c: "Remax Am", p: "5491134721020" },
  { n: "Pablo", l: "Farías", c: "Remax Am", p: "5491166626636" },
  { n: "Silvia", l: "Vincenzini", c: "Remax Am", p: "5491159386000" },
  { n: "Alejandra", l: "Lopez Otamendi", c: "Remax Amazing", p: "5491144163003" },
  { n: "Eduardo", l: "Rodríguez", c: "Remax Amazing", p: "5491132754912" },
  { n: "Matías", l: "Rodríguez Viali", c: "Remax Amazing", p: "5491123574385" },
  { n: "Perla", l: "", c: "Remax Amazing", p: "5491150358061" },
  { n: "Susana", l: "", c: "Remax Amazing", p: "5491131341106" },
  { n: "Alejandro", l: "", c: "Remax Ayres", p: "5491158013667" },
  { n: "Daniela", l: "", c: "Remax Ayres", p: "5491150066760" },
  { n: "Gerardo", l: "Aguirre", c: "Remax Ayres", p: "5491151344349" },
  { n: "Laura", l: "Rey", c: "Remax Ayres", p: "5491130256497" },
  { n: "Silvia", l: "Merlo", c: "Remax Ayres", p: "5491169509812" },
  { n: "Candelaria", l: "Larguia", c: "Remax Bahia", p: "5491154045176" },
  { n: "Patsy", l: "Fiore", c: "Remax Bahia", p: "5491168984898" },
  { n: "Pablo", l: "Espósito", c: "Remax Buró 2", p: "5491156341414" },
  { n: "Alejandra", l: "Figueroa", c: "Remax Buró", p: "5491162246195" },
  { n: "Celeste", l: "Savone", c: "Remax", p: "5491154146857" },
  { n: "Carla", l: "Vinograd", c: "Remax Central", p: "5491140890005" },
  { n: "Carolina", l: "", c: "Remax Central", p: "5491150604928" },
  { n: "Gilda", l: "Parrotta", c: "Remax Central", p: "5491157372248" },
  { n: "Juan Martín", l: "", c: "Remax Central", p: "5491157570702" },
  { n: "César", l: "Negrette", c: "Remax", p: "5491128519612" },
  { n: "Alejandra", l: "", c: "Remax City", p: "5491165289923" },
  { n: "Ángeles", l: "Asencio", c: "Remax City", p: "5491149169052" },
  { n: "Angelica", l: "Volzone", c: "Remax City", p: "5491128861951" },
  { n: "Carolina", l: "", c: "Remax City", p: "5491150034710" },
  { n: "Damián", l: "Baravas", c: "Remax City", p: "5491161340176" },
  { n: "Daniel", l: "", c: "Remax City", p: "5491163701849" },
  { n: "Daniela", l: "", c: "Remax City", p: "5491131197575" },
  { n: "Ester", l: "", c: "Remax City", p: "5491132329601" },
  { n: "Virginia", l: "", c: "Remax City", p: "5491156420977" },
  { n: "Valeria", l: "", c: "Remax Class", p: "5491130417236" },
  { n: "Julieta", l: "Carradori", c: "Remax Classic", p: "5491121582137" },
  { n: "Lilia", l: "Saucedo", c: "Remax Classic", p: "5491168484819" },
  { n: "Andrea", l: "Magnaghi", c: "Remax Cosmo", p: "5491144140614" },
  { n: "Cristian", l: "", c: "Remax Cosmo", p: "5491162440705" },
  { n: "Daniel", l: "Chaij", c: "Remax Cosmo", p: "5491123486751" },
  { n: "Juan Martín", l: "Sanabria", c: "Remax Cosmo", p: "5491130676975" },
  { n: "Laura", l: "Campagna", c: "Remax Cosmo", p: "5491140725506" },
  { n: "Lelia", l: "Medina", c: "Remax Cosmo", p: "5491165339341" },
  { n: "Leonardo", l: "", c: "Remax Cosmo", p: "5491164620485" },
  { n: "MARCELO", l: "", c: "Remax Cosmo", p: "5491153089160" },
  { n: "Pablo", l: "", c: "Remax Cosmo", p: "5491161817311" },
  { n: "Paula", l: "", c: "Remax Cosmo", p: "5491162913950" },
  { n: "Sebastián", l: "Higa", c: "Remax Cosmo", p: "5491167316010" },
  { n: "Soledad", l: "", c: "Remax Cosmo", p: "5491165278847" },
  { n: "Samanta", l: "Val", c: "Remax Data Lagos", p: "5491136059059" },
  { n: "Mauricio", l: "", c: "Remax Destino", p: "5491163596217" },
  { n: "Daniela", l: "Mc Loughlin", c: "Remax Destino", p: "5491158260778" },
  { n: "Eliana", l: "Barreto", c: "Remax Destino", p: "5491169917751" },
  { n: "Federico", l: "", c: "Remax Destino", p: "5491132343528" },
  { n: "Gabriela", l: "", c: "Remax Destino", p: "5491151038120" },
  { n: "Leandro", l: "Maroni", c: "Remax Destino", p: "5491157382388" },
  { n: "Vladimir", l: "Covalschi", c: "Remax Destino", p: "5491151405796" },
  { n: "Franco", l: "Savone", c: "Remax Emblema", p: "5491154243978" },
  { n: "Hernán", l: "T", c: "Remax Emblema", p: "5491123006395" },
  { n: "Leonardo", l: "Cabrera", c: "Remax Emblema", p: "5492392459275" },
  { n: "Sofía", l: "Aguilar Benítez", c: "Remax Emblema", p: "5491149457650" },
  { n: "Magali", l: "Ini", c: "Remax Encore", p: "5491131752458" },
  { n: "Andrea", l: "", c: "Remax Energy", p: "5491158909696" },
  { n: "Claudia", l: "", c: "Remax Energy", p: "5491165610510" },
  { n: "Miriam", l: "", c: "Remax Energy", p: "5491151747396" },
  { n: "Asistente", l: "", c: "Remax Estefanía", p: "5491138750749" },
  { n: "Gabriel", l: "Speranza", c: "Remax Genesis", p: "5491137056191" },
  { n: "Elías", l: "Rivera", c: "Remax Horizonte", p: "5491165866629" },
  { n: "Ana", l: "Savone", c: "Remax Juntos", p: "5491155115589" },
  { n: "Lorenzo", l: "", c: "Remax Juntos", p: "5491136488686" },
  { n: "Pablo", l: "Reina", c: "Remax La Vie", p: "5491132362679" },
  { n: "Juan Manuel", l: "", c: "Remax Legado", p: "5491163656227" },
  { n: "Leonardo", l: "", c: "Remax Urbana", p: "5491123220391" },
  { n: "Leonardo", l: "", c: "Remax Parque II", p: "5491158006577" },
  { n: "Nelson", l: "Herrera", c: "Remax Liberty", p: "5491153223813" },
  { n: "Mechi", l: "Pontoriero", c: "Remax Liberty", p: "5491157545665" },
  { n: "Romina", l: "", c: "Remax Liberty", p: "5491166016597" },
  { n: "Soraya", l: "", c: "Remax Liberty", p: "5491155772720" },
  { n: "Verónica", l: "Ferdman", c: "Remax Liberty", p: "5491130632945" },
  { n: "Vilma", l: "Maldonado", c: "Remax Liberty", p: "5491150632789" },
  { n: "Mara", l: "Rubinovich", c: "Remax", p: "5491135551450" },
  { n: "Franca", l: "Montillo", c: "Remax Nativo", p: "5491170053527" },
  { n: "Nancy", l: "Urquiza", c: "Remax Noedelta", p: "5491164977774" },
  { n: "Andrés", l: "Spataro", c: "Remax Nordelta", p: "5491122903000" },
  { n: "Monica", l: "Palermo", c: "Remax Nordelta", p: "5491153699229" },
  { n: "Verónica", l: "Cassin", c: "Remax P", p: "5491157993635" },
  { n: "Alejandro", l: "Guelman", c: "Remax P1", p: "5491162898678" },
  { n: "Ana", l: "", c: "Remax P1", p: "5491164849606" },
  { n: "Berni", l: "", c: "Remax P1", p: "5491153413889" },
  { n: "Daniel", l: "Endler", c: "Remax P1", p: "5491160498840" },
  { n: "Eduardo", l: "", c: "Remax P1", p: "5491167827703" },
  { n: "Federico", l: "Donofrio", c: "Remax P1", p: "5491161307988" },
  { n: "Nico", l: "Bursztyn", c: "Remax P1", p: "5491156937470" },
  { n: "Yanela", l: "", c: "Remax P1", p: "5491159128579" },
  { n: "Alberto", l: "Hurovich", c: "Remax P2", p: "5491156209974" },
  { n: "Alberto", l: "Rodríguez", c: "Remax P2", p: "5491150378616" },
  { n: "Alejandra", l: "", c: "Remax P2", p: "5491141941691" },
  { n: "Alejandro", l: "Ferrer", c: "Remax P2", p: "5491165005432" },
  { n: "Alejo", l: "H", c: "Remax P2", p: "5491167844680" },
  { n: "Ariel", l: "Sartore", c: "Remax P2", p: "5491161766663" },
  { n: "Carlos", l: "Salgueiro", c: "Remax P2", p: "5491166853940" },
  { n: "Carolina", l: "Cassab", c: "Remax P2", p: "5491164716063" },
  { n: "Claudia", l: "Guitron", c: "Remax P2", p: "5491164779685" },
  { n: "Daniel", l: "Murphy", c: "Remax P2", p: "5491168801000" },
  { n: "Daniel", l: "Rearte", c: "Remax P2", p: "5491150063515" },
  { n: "Daniela", l: "", c: "Remax P2", p: "5491162069069" },
  { n: "Daniela", l: "", c: "Remax P2", p: "5491134804983" },
  { n: "Debora", l: "", c: "Remax P2", p: "5491140637313" },
  { n: "Edy", l: "", c: "Remax P2", p: "5491160958587" },
  { n: "Emilia", l: "Torrado", c: "Remax P2", p: "5491164413328" },
  { n: "Emiliano", l: "Feler", c: "Remax P2", p: "5491169029446" },
  { n: "Fernando", l: "Salgueiro", c: "Remax P2", p: "5491138899524" },
  { n: "Gaby", l: "López", c: "Remax P2", p: "5491158516555" },
  { n: "Hernan", l: "Rodriguez", c: "Remax P2", p: "5491151257956" },
  { n: "Joaquin", l: "Calo", c: "Remax P2", p: "5491136541601" },
  { n: "Kendra", l: "", c: "Remax P2", p: "5491130430612" },
  { n: "Laura", l: "Vidal", c: "Remax P2", p: "5491151025453" },
  { n: "Laura", l: "Wizenberg", c: "Remax P2", p: "5491153864992" },
  { n: "Leandro", l: "", c: "Remax P2", p: "5491155866479" },
  { n: "Leonel", l: "García", c: "Remax P2", p: "5491158958049" },
  { n: "Luca", l: "Rosso", c: "Remax P2", p: "5491122863437" },
  { n: "Marcelo", l: "Ferrer", c: "Remax P2", p: "5491164445464" },
  { n: "Mariana", l: "Abru", c: "Remax P2", p: "5491136696353" },
  { n: "Mariana", l: "Berenstein", c: "Remax P2", p: "5491150252520" },
  { n: "Mariela", l: "Luna", c: "Remax P2", p: "5491126544732" },
  { n: "Mónica", l: "", c: "Remax P2", p: "5491161255429" },
  { n: "Natalia", l: "Randazzo", c: "Remax P2", p: "5491153256289" },
  { n: "Nicolas", l: "", c: "Remax P2", p: "5491132066960" },
  { n: "Nicolás", l: "Tamareu", c: "Remax P2", p: "5491158703590" },
  { n: "Omar", l: "Lopez", c: "Remax P2", p: "5491136761902" },
  { n: "Pablo", l: "", c: "Remax P2", p: "5491137609715" },
  { n: "Paula", l: "Rosso", c: "Remax P2", p: "5491137981010" },
  { n: "Renata", l: "", c: "Remax P2", p: "5491156180191" },
  { n: "Ricardo", l: "Barthes", c: "Remax P2", p: "54911444484396" },
  { n: "Ricardo", l: "Correa", c: "Remax P2", p: "5491130323400" },
  { n: "Roberto", l: "Ortega", c: "Remax P2", p: "5491134234111" },
  { n: "Rodrigo", l: "Salaberri", c: "Remax P2", p: "5491153197127" },
  { n: "Romina", l: "Olewsky", c: "Remax P2", p: "5491134630721" },
  { n: "Gabriela", l: "", c: "Remax P2", p: "5491140921755" },
  { n: "Sabrina", l: "Soria", c: "Remax P2", p: "5491133996643" },
  { n: "Sebastián", l: "", c: "Remax P2", p: "5491165030078" },
  { n: "Silvina", l: "", c: "Remax P2", p: "5491149982320" },
  { n: "Susana", l: "Santiano", c: "Remax P2", p: "5491136687185" },
  { n: "Tomas", l: "Colombo", c: "Remax P2", p: "5491168609004" },
  { n: "Uriel", l: "Moncarz", c: "Remax P2", p: "5491155170882" },
  { n: "Valerie", l: "", c: "Remax P2", p: "5491158856674" },
  { n: "Marina", l: "", c: "Remax P3", p: "5491161745430" },
  { n: "Mercedes", l: "", c: "Remax P3", p: "5491154243200" },
  { n: "Betina", l: "Cohen", c: "Remax P4", p: "5491169402791" },
  { n: "Cindy", l: "Masri", c: "Remax Premium IV", p: "5491161971919" },
  { n: "Claudio", l: "", c: "Remax P4", p: "5491144444774" },
  { n: "Damián", l: "Díaz", c: "Remax P4", p: "5491138653376" },
  { n: "Fernando Miguel", l: "Vera", c: "Remax P4", p: "5491155241348" },
  { n: "Juan Carlos", l: "", c: "Remax P4", p: "5491162305935" },
  { n: "Lisette", l: "", c: "Remax P4", p: "5491140471801" },
  { n: "Yamila", l: "Martínez", c: "Remax P4", p: "5491156565020" },
  { n: "Luis", l: "Schmukler", c: "Remax Par", p: "5491162008087" },
  { n: "Martha", l: "Monsalvo", c: "Remax Par", p: "5491153426127" },
  { n: "Sorelis", l: "Salvatierra", c: "Remax Par3", p: "5491130432445" },
  { n: "Agustina", l: "", c: "Remax Parque", p: "5491130892554" },
  { n: "Alejandra", l: "Ferechian", c: "Remax Parque", p: "5491151151696" },
  { n: "Anabella", l: "", c: "Remax Parque", p: "5491165895507" },
  { n: "María Eugenia", l: "Zampa", c: "Remax Parque", p: "5491161028093" },
  { n: "Emiliano", l: "Guerra", c: "Remax Parque", p: "5491133772200" },
  { n: "Geraldine", l: "Capria", c: "Remax Parque", p: "5491158635867" },
  { n: "Gerardo", l: "Lencina", c: "Remax Parque", p: "5491158512054" },
  { n: "Guillermo", l: "", c: "Remax Parque", p: "5491134695900" },
  { n: "José Ignacio", l: "", c: "Remax Parque", p: "5491138855959" },
  { n: "JUAN CARLOS", l: "ATENCIO", c: "Remax Parque", p: "5491124019507" },
  { n: "Liliana", l: "Deluca", c: "Remax Parque", p: "5491164731957" },
  { n: "Mariano", l: "", c: "Remax Parque", p: "5491169589935" },
  { n: "Mariano Nicolás", l: "Romano", c: "Remax Parque", p: "5491154772386" },
  { n: "Máximo", l: "Markart", c: "Remax Parque", p: "5491141637945" },
  { n: "Meli", l: "Sindin", c: "Remax Parque", p: "5491121626209" },
  { n: "Mirtha", l: "", c: "Remax Parque", p: "5491150973145" },
  { n: "Patricia", l: "Biava", c: "Remax Parque", p: "5491159275589" },
  { n: "Rosa", l: "Sotelo", c: "Remax Parque", p: "5491154067543" },
  { n: "Silvana", l: "", c: "Remax Parque", p: "5491150517758" },
  { n: "Silvia", l: "Oliveto", c: "Remax Parque", p: "5491144145107" },
  { n: "Vanina", l: "", c: "Remax Parque", p: "5491121906484" },
  { n: "Viviana", l: "Carino", c: "Remax Parque", p: "5491131478933" },
  { n: "Daniel", l: "Martin", c: "Remax Platino 2", p: "5491157415205" },
  { n: "Laura", l: "Hoyo", c: "Remax Platino 2", p: "5491136825699" },
  { n: "Vale", l: "", c: "Remax Platino 2", p: "5491164622439" },
  { n: "Ana Belen", l: "Alvarez Gardiol", c: "Remax Platino", p: "5491131858923" },
  { n: "Andrea", l: "Fatala", c: "Remax Platino", p: "5491151461972" },
  { n: "Betina", l: "", c: "Remax Platino", p: "5491160474847" },
  { n: "Dorotea", l: "", c: "Remax Platino", p: "5491154703403" },
  { n: "Flavia", l: "", c: "Remax Platino II", p: "5491155840055" },
  { n: "Gabriela", l: "", c: "Remax Platino", p: "5491156390478" },
  { n: "Geraldine", l: "", c: "Remax Platino", p: "5491141624747" },
  { n: "Ignacio", l: "", c: "Remax Platino", p: "5491144281872" },
  { n: "Juan", l: "", c: "Remax Platino", p: "5491163020751" },
  { n: "Leo", l: "Pereira", c: "Remax Platino", p: "5491130692481" },
  { n: "Lucas", l: "", c: "Remax Platino", p: "5491136973231" },
  { n: "Marcela", l: "", c: "Remax Platino", p: "5491161802755" },
  { n: "Marilú", l: "", c: "Remax Platino", p: "5491161491166" },
  { n: "Michelle", l: "", c: "Remax Platino", p: "5491166275387" },
  { n: "Pamela", l: "Suárez", c: "Remax Platino", p: "5491141734595" },
  { n: "Patricia", l: "Gómez", c: "Remax Platino", p: "5491167858948" },
  { n: "Ruth", l: "Maier", c: "Remax Platino", p: "5491140391420" },
  { n: "Sandra", l: "", c: "Remax Platino", p: "5491167518620" },
  { n: "Stella Maris", l: "Fari", c: "Remax Platino", p: "5491149744608" },
  { n: "Angie", l: "Chumillo", c: "Remax Platino", p: "5491137778227" },
  { n: "Cintia", l: "", c: "Remax Plaza", p: "5491155294445" },
  { n: "Claudia", l: "", c: "Remax Plaza", p: "5491147822546" },
  { n: "Darío", l: "Duek", c: "Remax Plaza", p: "5491154607867" },
  { n: "David", l: "", c: "Remax Plaza", p: "5491126821436" },
  { n: "Fernando", l: "Pérez González", c: "Remax Plaza", p: "5491157129238" },
  { n: "Gabriela", l: "", c: "Remax Plaza", p: "5491134901503" },
  { n: "Gonzalo", l: "", c: "Remax Plaza", p: "5491138420601" },
  { n: "Juli", l: "", c: "Remax Plaza", p: "5491131217021" },
  { n: "Julio", l: "", c: "Remax Plaza", p: "5491161886838" },
  { n: "Martín", l: "", c: "Remax Plaza", p: "5491153392228" },
  { n: "Mauricio", l: "Pinto", c: "Remax Plaza", p: "5491141568001" },
  { n: "Mónica", l: "", c: "Remax Plaza", p: "5491134388110" },
  { n: "Raúl", l: "Romero", c: "Remax Plaza", p: "5491124869636" },
  { n: "Rocío", l: "", c: "Remax Plaza", p: "5491169981612" },
  { n: "Roxana", l: "", c: "Remax Plaza", p: "5491153743124" },
  { n: "Silvia", l: "Cauzillo", c: "Remax Plaza", p: "5491156687118" },
  { n: "Veronica", l: "Babouth", c: "Remax Plaza", p: "5491158320221" },
  { n: "Natalia", l: "Szifron", c: "Remax Premium II", p: "5491155788889" },
  { n: "Naty", l: "", c: "Remax Premium Ii", p: "5491144022597" },
  { n: "Silvia", l: "", c: "Remax Premium", p: "5491160498883" },
  { n: "Antonella", l: "", c: "Remax Propósito", p: "5491164839793" },
  { n: "Daniela", l: "", c: "Remax Propósito", p: "5491144376002" },
  { n: "Silvina", l: "Ilchitzky", c: "Remax Raíces", p: "5491141946688" },
  { n: "Emilia", l: "Flores", c: "Remax Raíces", p: "5491134655249" },
  { n: "Fernanda", l: "Ortiz", c: "Remax Raíces", p: "5491131097583" },
  { n: "Gabriel", l: "Serrudo", c: "Remax Raíces", p: "5491122675512" },
  { n: "Ingrid", l: "Cannata", c: "Remax Raíces", p: "5491132678049" },
  { n: "Jorge", l: "Medina", c: "Remax Raices", p: "5491161792053" },
  { n: "Juan", l: "Pablo", c: "Remax Raíces", p: "5491161118877" },
  { n: "Judith", l: "", c: "Remax Raíces", p: "5491138932553" },
  { n: "July", l: "", c: "Remax Raíces", p: "5491158704691" },
  { n: "Mariel", l: "", c: "Remax Raíces", p: "5491130823196" },
  { n: "Mauro", l: "", c: "Remax Raíces", p: "5491166962186" },
  { n: "Maximiliano", l: "", c: "Remax Raíces", p: "5491162322626" },
  { n: "Nancy", l: "", c: "Remax Raíces", p: "5493515483378" },
  { n: "Natalia", l: "", c: "Remax Raíces", p: "5491153863791" },
  { n: "Rafael", l: "Contreras", c: "Remax Raíces", p: "5491123291069" },
  { n: "Romina", l: "", c: "Remax Raíces", p: "5491130665111" },
  { n: "Samanta", l: "Plat", c: "Remax Raíces", p: "5491136303345" },
  { n: "Susana", l: "Saliche", c: "Remax Raíces", p: "5491130803988" },
  { n: "Vanesa", l: "", c: "Remax Raices", p: "5491155775562" },
  { n: "Roneide", l: "Costa", c: "Remax", p: "5491126257252" },
  { n: "Valeria", l: "Luko", c: "Remax Splendid", p: "5491156614700" },
  { n: "Liliana", l: "Zayas", c: "Remax T4", p: "5491144997447" },
  { n: "Norma", l: "", c: "Remax T6", p: "5491140653773" },
  { n: "Romina", l: "Pastorino", c: "Remax T6", p: "5491150636009" },
  { n: "Silvia", l: "Banchs", c: "Remax T6", p: "5491140444966" },
  { n: "Analía", l: "", c: "Remax T7", p: "5491151800161" },
  { n: "Mariano", l: "Prado", c: "Remax Tango", p: "5491122566928" },
  { n: "Euge", l: "", c: "Remax Total Gold", p: "5491164851507" },
  { n: "Andrea", l: "Menarvino", c: "Remax Total VI", p: "5491168604399" },
  { n: "Cecilia", l: "", c: "Remax Total VI", p: "5491151750319" },
  { n: "Laura", l: "", c: "Remax Total VI", p: "5491158969561" },
  { n: "Patricia", l: "Zavala", c: "Remax Total VI", p: "5491140465883" },
  { n: "Alejandro", l: "Medel", c: "Remax U", p: "5491131301375" },
  { n: "Ana", l: "Crosetti", c: "Remax U", p: "5491132722770" },
  { n: "Andrea", l: "Calo", c: "Remax U", p: "5491131080939" },
  { n: "Andrea", l: "Martínez", c: "Remax U", p: "5491168853068" },
  { n: "Clara", l: "Grassi", c: "Remax U", p: "5491140516285" },
  { n: "Claudio", l: "Moreira", c: "Remax U", p: "5491167604812" },
  { n: "Cristian", l: "", c: "Remax U", p: "5491134930734" },
  { n: "Daniel", l: "Servide", c: "Remax U", p: "5491164848741" },
  { n: "Eugenia", l: "Linari", c: "Remax U", p: "5491156378625" },
  { n: "Eugenia", l: "Zanetta", c: "Remax U", p: "5491140902711" },
  { n: "Fernando", l: "Campitelli", c: "Remax U", p: "5491159028999" },
  { n: "Flavio", l: "", c: "Remax U", p: "5491155655562" },
  { n: "Flor", l: "Casentini", c: "Remax U", p: "5491131775500" },
  { n: "Gabi", l: "Martinez", c: "Remax U", p: "5491162562894" },
  { n: "Gabriel", l: "", c: "Remax U", p: "5491155253158" },
  { n: "Gabriela", l: "", c: "Remax U", p: "5491155775910" },
  { n: "Javier", l: "", c: "Remax U", p: "5491143997190" },
  { n: "Johanna", l: "Cohen", c: "Remax U", p: "5491162268478" },
  { n: "Karina", l: "Quinteros", c: "Remax U", p: "5491158496328" },
  { n: "Marcela", l: "", c: "Remax U", p: "5491167590589" },
  { n: "Mariana", l: "Casas", c: "Remax U", p: "5491135790581" },
  { n: "Marisa", l: "Riobó", c: "Remax U", p: "5491167286136" },
  { n: "Martín", l: "Orso", c: "Remax U", p: "5491150579170" },
  { n: "Matías", l: "Gestor", c: "Remax U", p: "5491168150044" },
  { n: "Mónica", l: "Mon", c: "Remax U", p: "5491132956389" },
  { n: "Nicolás", l: "M", c: "Remax U", p: "5491164644787" },
  { n: "Osmar", l: "", c: "Remax U", p: "5491164461032" },
  { n: "Paola", l: "", c: "Remax U", p: "5491132698644" },
  { n: "Paula", l: "", c: "Remax U", p: "5491166370744" },
  { n: "Romina", l: "Gavagna", c: "Remax U", p: "5491155743189" },
  { n: "Sandra", l: "", c: "Remax U", p: "5491153387293" },
  { n: "Sergio", l: "Gutiérrez", c: "Remax U", p: "5491134609022" },
  { n: "Silcha", l: "", c: "Remax U", p: "5491166603507" },
  { n: "Carolina", l: "", c: "Remax U Staff", p: "5491140952575" },
  { n: "Euge", l: "", c: "Remax U Staff", p: "5491132663548" },
  { n: "Vanina", l: "Chueque", c: "Remax U", p: "5491121936566" },
  { n: "Victoria", l: "Marchesini", c: "Remax U", p: "5491138132837" },
  { n: "Viviana", l: "", c: "Remax U", p: "5491159649899" },
  { n: "Adrián", l: "Di Leva", c: "Remax U2", p: "5491165186806" },
  { n: "Alejandra", l: "Mayo", c: "Remax U2", p: "5491166844835" },
  { n: "Analía", l: "López", c: "Remax U2", p: "5491153244678" },
  { n: "Damián", l: "", c: "Remax U2", p: "5491131232049" },
  { n: "Facundo", l: "De Bari", c: "Remax U2", p: "5491154975019" },
  { n: "Fernanda", l: "", c: "Remax U2", p: "549114063658" },
  { n: "Georgina", l: "", c: "Remax U2", p: "5491164308908" },
  { n: "Gustavo", l: "Doctorovich", c: "Remax U2", p: "5491130242279" },
  { n: "Ines", l: "Bazo", c: "Remax U2", p: "5491139196774" },
  { n: "Isabel", l: "", c: "Remax U2", p: "5491144931794" },
  { n: "Jonathan", l: "Balbis", c: "Remax U2", p: "5491169141292" },
  { n: "Julieta", l: "Cugat", c: "Remax U2", p: "5491123769796" },
  { n: "Julieta", l: "Muñoz", c: "Remax U2", p: "5491133691488" },
  { n: "Lidia", l: "", c: "Remax U2", p: "5491141986477" },
  { n: "Martin", l: "Guagnini", c: "Remax U2", p: "5491144200643" },
  { n: "Micaela", l: "", c: "Remax U2", p: "5491140711354" },
  { n: "Rodrigo", l: "Varela", c: "Remax U2", p: "5491168757200" },
  { n: "Roxana", l: "Nicora", c: "Remax U2", p: "5491154091132" },
  { n: "Sergio", l: "Pacheco", c: "Remax U2", p: "5491151809829" },
  { n: "Silvia", l: "Movia", c: "Remax U2", p: "5491153105050" },
  { n: "Mariana", l: "Mánager", c: "Remax U2 Staff", p: "5491168757199" },
  { n: "Vanesa", l: "Sasso", c: "Remax U2", p: "5491158756236" },
  { n: "Walter", l: "Sánchez", c: "Remax U2", p: "5491133229324" },
  { n: "Candelaria", l: "Bosio", c: "Remax Uno", p: "5491137747244" },
  { n: "Caro", l: "Astudillo", c: "Remax Uno", p: "5491168810109" },
  { n: "Julieta", l: "Ricardo", c: "Remax Uno", p: "5491164507015" },
  { n: "Andrea", l: "Bressan", c: "Remax Uno", p: "5491156594211" },
  { n: "Graciela", l: "", c: "Remax Uno", p: "5491167108294" },
  { n: "Gabriel", l: "", c: "Remax Uno", p: "5491164523125" },
  { n: "Marcela", l: "", c: "Remax Uno", p: "5491149714705" },
  { n: "Mónica", l: "", c: "Remax Uno", p: "5491153231868" },
  { n: "Cecilia", l: "", c: "Remax Vanguard", p: "5491149692010" },
  { n: "Ana", l: "Colle", c: "Remax Vincit", p: "5491168758971" },
  { n: "Anabel", l: "Otero", c: "Remax Vision", p: "5491158919157" },
  { n: "Sandra", l: "Villegas", c: "Remax Visión", p: "5491164954901" },
  { n: "Andrea", l: "Torres", c: "Remax Visión", p: "5491144454507" },
  { n: "Daniel", l: "", c: "Remax Visión", p: "5491150355261" },
  { n: "Natalia", l: "Gomez", c: "Remax Work", p: "5491151251946" },
  { n: "Marcela", l: "", c: "Remax Zafiro", p: "5491151379110" },
  { n: "Rocio", l: "Gullotta", c: "Remax Platino", p: "5491133719756" },
  { n: "Rodo", l: "Elia", c: "Desarrollador", p: "5491162714455" },
  { n: "Rosario", l: "Lungo", c: "Martillera", p: "5491144347225" },
  { n: "Roxana", l: "", c: "Remax", p: "5491164999922" },
  { n: "Roxana", l: "Silva", c: "Unamor.deco", p: "5492804365421" },
  { n: "Sabrina", l: "", c: "", p: "5491169738856" },
  { n: "Sandra", l: "", c: "Botts", p: "5491150489139" },
  { n: "sandra", l: "gallelli", c: "Real Estate", p: "5491163308097" },
  { n: "Sandra", l: "Grisiglione", c: "Remax Raices", p: "5491132551229" },
  { n: "Santiago", l: "Cruciani", c: "Remax City", p: "5491159722511" },
  { n: "Santiago", l: "", c: "Remax Urbana", p: "5491166687401" },
  { n: "Silvana", l: "Sisto", c: "Remax", p: "5491131805333" },
  { n: "Sofi", l: "", c: "Remax Urbana III", p: "5491122731911" },
  { n: "Sofia", l: "Marcoccia", c: "Remax Leo", p: "5491130005924" },
  { n: "Sol", l: "Rey", c: "Remax", p: "5491140995068" },
  { n: "Sole", l: "Pineda", c: "Remax Platino", p: "5491126604921" },
  { n: "Sole", l: "", c: "Pareja Martin", p: "5491158006961" },
  { n: "Susana", l: "Martin Vera", c: "", p: "5491151103838" },
  { n: "Susy", l: "Grela", c: "Remax", p: "5491154579588" },
  { n: "Tajita", l: "", c: "", p: "5491123916901" },
  { n: "Uriel", l: "Goldcher", c: "", p: "5491123249100" },
  { n: "Valeria", l: "Yellati", c: "Airbnb", p: "5491164175739" },
  { n: "Verónica", l: "Fattore", c: "Platino Martinez", p: "5491131808376" },
  { n: "Veronica", l: "Lucarelli", c: "Interiores", p: "5491155845261" },
  { n: "Victor", l: "Murano", c: "C21", p: "5491155818007" },
  { n: "Vir", l: "Argüello", c: "", p: "5491156695440" },
  { n: "Viviana", l: "", c: "Montero Propiedades", p: "5491153117554" },
  { n: "Ximena", l: "", c: "Remax Platino", p: "5491152487896" },
  { n: "Yanina", l: "Almaraz", c: "Remax", p: "5491158904559" },
  { n: "Yanina", l: "Fraga", c: "Premium II", p: "5491155261328" },
  { n: "Vanina", l: "Naccarati", c: "Yankel", p: "5491136201731" }
];

export default function LeadMailer({ onClose }) {
  const [contactedIndices, setContactedIndices] = useState(() => {
    const saved = localStorage.getItem('re_contacted_leads');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentBatch, setCurrentBatch] = useState([]);
  const [template, setTemplate] = useState(() => {
    const saved = localStorage.getItem('re_lead_template');
    return saved || "¡Hola [NOMBRE]! Vi que estás en [EMPRESA]. Te escribo de RE! porque estamos renovando equipos y tenemos disponibilidad para sesiones de fotos esta semana.";
  });
  const [sessionSent, setSessionSent] = useState([]);
  const [templateSaved, setTemplateSaved] = useState(false);

  const saveTemplate = () => {
    localStorage.setItem('re_lead_template', template);
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2000);
  };

  useEffect(() => {
    localStorage.setItem('re_contacted_leads', JSON.stringify(contactedIndices));
  }, [contactedIndices]);

  const generateBatch = () => {
    const available = LEADS_DATA.map((l, i) => ({ ...l, originalIndex: i }))
      .filter(l => !contactedIndices.includes(l.originalIndex));
    
    // Shuffle logic
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    setCurrentBatch(shuffled.slice(0, 10));
    setSessionSent([]);
  };

  const handleSend = (lead) => {
    const cleanName = lead.n.trim();
    const cleanCompany = lead.c.trim() || "tu inmobiliaria";
    
    const message = template
      .replace(/\[NOMBRE\]/g, cleanName)
      .replace(/\[EMPRESA\]/g, cleanCompany);
    
    const waUrl = `https://wa.me/${lead.p}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    if (!contactedIndices.includes(lead.originalIndex)) {
      setContactedIndices(prev => [...prev, lead.originalIndex]);
    }
    setSessionSent(prev => [...prev, lead.originalIndex]);
  };

  const resetAll = () => {
    if (window.confirm("¿Estás seguro? Se borrará todo el progreso y volverás a empezar desde cero la lista de 435 contactos.")) {
      setContactedIndices([]);
      setCurrentBatch([]);
      localStorage.removeItem('re_contacted_leads');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-indigo-600 p-5 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-extrabold text-sm md:text-base uppercase tracking-widest flex items-center gap-2">
              <MessageCircle size={18} /> Outreach Automático
            </h3>
            <p className="text-[10px] opacity-80 font-medium">
              Progreso Total: {contactedIndices.length} / {LEADS_DATA.length} leads
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><X size={18}/></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Progress Bar */}
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-500 h-full transition-all duration-500" 
              style={{ width: `${(contactedIndices.length / LEADS_DATA.length) * 100}%` }}
            />
          </div>

          {/* Template Editor */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Mensaje Personalizado</label>
              <button 
                onClick={saveTemplate}
                className={`text-[9px] font-black uppercase px-2 py-1 rounded transition-all ${templateSaved ? 'bg-green-500 text-white' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}
              >
                {templateSaved ? '✓ Guardado' : 'Guardar Template'}
              </button>
            </div>
            <textarea 
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full h-24 bg-white border border-gray-200 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              placeholder="Escribe tu mensaje..."
            />
            <div className="flex gap-4 mt-2 text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
              <span className="bg-white px-2 py-1 rounded border border-gray-200">[NOMBRE]</span>
              <span className="bg-white px-2 py-1 rounded border border-gray-200">[EMPRESA]</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button 
              onClick={generateBatch}
              disabled={contactedIndices.length === LEADS_DATA.length}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[11px] tracking-widest py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
            >
              <RefreshCw size={16} /> {contactedIndices.length === LEADS_DATA.length ? 'Lista Completada' : 'Obtener 10 Random'}
            </button>
            <button 
              onClick={resetAll}
              className="bg-red-50 hover:bg-red-100 text-red-500 p-4 rounded-xl border border-red-100 transition-colors"
              title="Reiniciar Progreso"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {/* Lead List */}
          <div className="space-y-2">
            {currentBatch.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Info size={40} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium italic">Haz clic en Obtener 10 para empezar</p>
              </div>
            ) : (
              currentBatch.map((lead, idx) => {
                const isSent = sessionSent.includes(lead.originalIndex);
                return (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isSent ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-gray-100 shadow-sm'}`}
                  >
                    <div className="truncate pr-4">
                      <div className="font-bold text-gray-800 text-sm truncate">{lead.n} {lead.l}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate">
                        🏢 {lead.c || "Particular"}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSend(lead)}
                      disabled={isSent}
                      className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[10px] uppercase transition-all ${isSent ? 'bg-green-100 text-green-600' : 'bg-[#25D366] text-white hover:brightness-105 shadow-sm active:scale-95'}`}
                    >
                      {isSent ? <CheckCircle2 size={14} /> : <Send size={14} />}
                      {isSent ? 'Enviado' : 'WhatsApp'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}