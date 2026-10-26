import {Button} from './ui/button';
export function DetailsPanel(){return (
<section className="panel details" id="details"><nav className="tabs"><Button className="tab active" data-tab="overview">Объяснение работы</Button><Button className="tab" data-tab="terminals">Клеммы и соединения</Button><Button className="tab" data-tab="selection">Выбранная клемма</Button><Button className="tab" data-tab="limitations">Безопасность и допущения</Button></nav><div className="detail-body" id="detailBody" /></section>
);}
